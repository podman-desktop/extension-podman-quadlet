// we cannot generate quadlet type for kube
export type QuadletTypeGenerate = Exclude<QuadletType, QuadletType.KUBE>;

export enum QuadletType {
  CONTAINER = 'Container',
  IMAGE = 'Image',
  POD = 'Pod',
  VOLUME = 'Volume',
  NETWORK = 'Network',
  KUBE = 'Kube',
}
