import type { APIRoute } from 'astro';
import { handleStatsApiProxy } from '../../lib/http/server/statsApiProxy';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  return handleStatsApiProxy(context);
};

export const HEAD: APIRoute = async (context) => {
  return handleStatsApiProxy(context);
};

export const OPTIONS: APIRoute = async (context) => {
  return handleStatsApiProxy(context);
};
