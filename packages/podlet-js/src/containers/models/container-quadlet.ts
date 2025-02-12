export interface ContainerQuadlet {
  Container: {
    AddHost?: string[],
    PublishPort?: string[],
    Annotation?: string[],
    Image?: string,
    ContainerName?: string,
    Entrypoint?: string,
    Exec?: string,
    Environment?: string[],
    ReadOnly?: boolean,
    Mount?: string[],
  };
}
