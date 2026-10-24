// Un progetto incorporato nel bundle come testo (`import … with { type: "text" }`), aperto con `apri`.
declare module "*.algo" {
  const testo: string;
  export default testo;
}
