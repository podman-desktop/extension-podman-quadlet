export interface QuadletGenerateTest {
  name: string;
  containerName: string;
  quadlet: string;
  options: RunContainerOptions;
}

export interface RunContainerOptions {
  entrypoint?: string;
}

export const GENERATE_TESTS: Array<QuadletGenerateTest> = [
  {
    name: 'simple-hello-world',
    containerName: 'simple-hello-world',
    quadlet: '[Container]\nImage=docker.io/library/alpine:latest\nContainerName=simple-hello-world',
    options: {},
  },
  {
    name: 'custom-entrypoint',
    containerName: 'custom-entrypoint',
    quadlet: '[Container]\nImage=docker.io/library/alpine:latest\nContainerName=custom-entrypoint\nEntrypoint=ls',
    options: {
      entrypoint: 'ls',
    },
  },
];
