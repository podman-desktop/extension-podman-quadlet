export interface Template {
  name: string;
  id: string;
  description: string;
  files: Array<{
    language: string;
    content: string;
    name: string;
  }>
}
