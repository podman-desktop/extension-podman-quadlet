export interface PodContainerPort {
  containerPort: number;
  hostPort: number;
}

export interface PodContainer {
  image: string;
  name: string;
  ports?: Array<PodContainerPort>
}

export interface PodmanPod {
  apiVersion: 'v1',
  kind: 'Pod',
  metadata: {
    name: string;
  },
  spec: {
    containers: Array<PodContainer>;
  },
}
