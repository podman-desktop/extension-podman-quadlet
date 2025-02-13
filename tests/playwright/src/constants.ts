export interface QuadletGenerateTest {
  name: string;
  containerName: string;
  quadlet: string;
}

export const GENERATE_TESTS: Array<QuadletGenerateTest> = [{
  name: 'simple-nginx',
  containerName: 'simple-nginx-quadlet',
  quadlet: '[Container]Image=quay.io/podman/hello:latestContainerName=/simple-nginx-quadlet',
}];
