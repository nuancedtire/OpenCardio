import { Hono } from "hono";

type Env = {
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Env }>();

// All requests are handled by Workers Assets (static SPA serving).
// Workers Assets is configured in wrangler.toml with not_found_handling = "single-page-application"
// so all non-asset routes fall back to index.html automatically.
app.get("*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
