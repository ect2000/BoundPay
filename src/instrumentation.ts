export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { config } = await import('./lib/server/config');
    config(); // Reject non-free models and public mock deployments before serving requests.
  }
}
