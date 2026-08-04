import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const commands = defineCollection({
  loader: glob({ base: './src/content/commands', pattern: '**/*.json' }),
  schema: z.object({
    categories: z.array(
      z.object({
        name: z.string(),
        commands: z.array(
          z.object({
            command: z.string(),
            description: z.string(),
          }),
        ),
      }),
    ),
  }),
});

const rules = defineCollection({
  loader: glob({ base: './src/content/rules', pattern: '**/*.json' }),
  schema: z.object({
    serverIp: z.string().optional(),
    warning: z.string(),
    minecraft: z.object({
      title: z.string(),
      items: z.array(z.object({ title: z.string(), html: z.string() })),
    }),
  }),
});

const faq = defineCollection({
  loader: glob({ base: './src/content/faq', pattern: '**/*.json' }),
  schema: z.array(
    z.object({
      title: z.string(),
      icon: z.enum(['BookOpen', 'Hammer', 'Shield', 'Cpu']),
      items: z.array(z.object({ q: z.string(), a: z.string() })),
    }),
  ),
});

const tutorial = defineCollection({
  loader: glob({ base: './src/content/tutorial', pattern: '**/*.md' }),
  schema: z.object({
    order: z.number().int().positive(),
    title: z.string(),
    icon: z.enum(['Wand', 'Shield', 'Hammer', 'UserRound', 'Map', 'Vote']),
    meta: z.string(),
    open: z.boolean().optional(),
    actions: z
      .array(
        z.object({
          label: z.string(),
          target: z.enum(['rules', 'commands', 'vote', 'dynmap', 'discord']),
          variant: z.enum(['primary', 'secondary', 'ghost']),
          icon: z.enum(['ArrowRight', 'Shield', 'Hammer', 'Map', 'Vote']).optional(),
        }),
      )
      .optional(),
  }),
});

export const collections = { commands, rules, faq, tutorial };
