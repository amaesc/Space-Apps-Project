/** Ruta a un archivo de public/ respetando el basePath (GitHub Pages sirve en /<repo>). */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
