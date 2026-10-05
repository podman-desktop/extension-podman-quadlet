#!/usr/bin/env bash

set -uo pipefail

package_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${package_dir}"

if [[ "$(uname -s)" != 'Linux' ]]; then
  echo 'Screen recording is available on Linux; running the smoke tests without captions.' >&2
  unset VIDEO_SUBTITLES CAPTION_PACE_MS CAPTION_TYPING_DURATION_MS
  exec npm run test:e2e:smoke
fi

for binary in ffmpeg xvfb-run; do
  if ! command -v "${binary}" >/dev/null 2>&1; then
    echo "Captioned recordings require ${binary}." >&2
    exit 2
  fi
done

screen_size='1280x960'
recordings_dir="${package_dir}/recordings"
video_file="${recordings_dir}/podman-quadlet-e2e.mp4"
raw_video_file="${recordings_dir}/podman-quadlet-e2e.raw.mp4"
subtitles_file="${recordings_dir}/podman-quadlet-e2e.ass"
chapters_file="${recordings_dir}/podman-quadlet-e2e.ffmetadata"
ffmpeg_log="${recordings_dir}/podman-quadlet-e2e.ffmpeg.log"

mkdir -p "${recordings_dir}"
rm -f "${video_file}" "${raw_video_file}" "${subtitles_file}" "${chapters_file}" "${ffmpeg_log}"

export VIDEO_SUBTITLES=true
export CAPTION_PACE_MS="${CAPTION_PACE_MS:-2000}"
export CAPTION_TYPING_DURATION_MS="${CAPTION_TYPING_DURATION_MS:-2000}"

xvfb-run --auto-servernum --server-args="-screen 0 ${screen_size}x24" -- \
  env RAW_VIDEO_FILE="${raw_video_file}" FFMPEG_LOG="${ffmpeg_log}" SCREEN_SIZE="${screen_size}" \
  bash -c '
    set -uo pipefail

    display_input="${DISPLAY}"
    if [[ "${display_input}" != *.* ]]; then
      display_input="${display_input}.0"
    fi

    # The reporter uses this clock to align captions with the desktop capture.
    export VIDEO_RECORDING_STARTED_AT="$(date +%s%3N)"

    ffmpeg -y -nostdin -hide_banner \
      -f x11grab -video_size "${SCREEN_SIZE}" -framerate 15 -i "${display_input}" \
      -an -codec:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 28 \
      -movflags +frag_keyframe+empty_moov+default_base_moof \
      "${RAW_VIDEO_FILE}" >"${FFMPEG_LOG}" 2>&1 &
    ffmpeg_pid=$!

    stop_ffmpeg() {
      kill -INT "${ffmpeg_pid}" 2>/dev/null || true
      wait "${ffmpeg_pid}" 2>/dev/null || true
    }
    trap stop_ffmpeg EXIT

    sleep 1
    if ! kill -0 "${ffmpeg_pid}" 2>/dev/null; then
      echo "ffmpeg failed to start; see ${FFMPEG_LOG}" >&2
      exit 1
    fi

    npx playwright test src/ --grep @smoke
    exit $?
  '
test_status=$?

if [[ ! -s "${raw_video_file}" || ! -s "${subtitles_file}" || ! -s "${chapters_file}" ]]; then
  echo "Recording files are incomplete; see ${recordings_dir}." >&2
  if [[ "${test_status}" -ne 0 ]]; then
    exit "${test_status}"
  fi
  exit 1
fi

ffmpeg -y -nostdin -hide_banner -i "${raw_video_file}" -i "${chapters_file}" \
  -map 0:v:0 -map_metadata 1 -map_chapters 1 \
  -vf 'subtitles=recordings/podman-quadlet-e2e.ass' \
  -an -codec:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 28 -movflags +faststart \
  "${video_file}" >>"${ffmpeg_log}" 2>&1
recording_status=$?

if [[ "${recording_status}" -eq 0 ]]; then
  rm -f "${raw_video_file}"
  echo "Captioned recording: ${video_file}"
else
  echo "Could not render captions; retaining the raw recording. See ${ffmpeg_log}." >&2
fi

if [[ "${test_status}" -ne 0 ]]; then
  exit "${test_status}"
fi
exit "${recording_status}"
