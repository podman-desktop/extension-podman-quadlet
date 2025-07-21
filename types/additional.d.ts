declare module 'tinro/dist/tinro_lib';

declare module '*.txt?raw' {
  const contents: string;
  export = contents;
}