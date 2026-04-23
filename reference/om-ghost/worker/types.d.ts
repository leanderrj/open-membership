/**
 * Worker-only ambient declarations.
 *
 * wrangler's [[rules]] with type = "Text" and globs = ["**\/*.yaml"]
 * rewrites YAML imports to strings; we tell TypeScript about the shape.
 */
declare module "*.yaml" {
  const content: string;
  export default content;
}
