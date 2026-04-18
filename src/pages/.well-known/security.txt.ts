import type { APIRoute } from 'astro';

import { minecraftGilde } from '../../config/minecraftGilde';
import { buildSecurityTxt } from '../../lib/securityTxt';

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(
    buildSecurityTxt({
      contactEmail: minecraftGilde.legal.email,
    }),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    },
  );
