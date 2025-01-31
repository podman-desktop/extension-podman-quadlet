// we cannot generate quadlet type for kube or build
export type QuadletTypeGenerate = Exclude<QuadletType, QuadletType.KUBE | QuadletType.BUILD>;

export enum QuadletType {
  CONTAINER = 'Container',
  IMAGE = 'Image',
  POD = 'Pod',
  VOLUME = 'Volume',
  NETWORK = 'Network',
  KUBE = 'Kube',
  BUILD = 'Build',
}
