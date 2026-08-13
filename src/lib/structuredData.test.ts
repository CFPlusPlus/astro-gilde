import { describe, expect, it } from 'vitest';

import { minecraftGilde } from '../config/minecraftGilde';
import {
  buildArticle,
  buildBaseGraph,
  buildFaqPage,
  buildGameServer,
  buildHowTo,
} from './structuredData';

type JsonLdNode = Record<string, unknown>;

const site = new URL('https://minecraft-gilde.de/');
const canonicalUrl = 'https://minecraft-gilde.de/serverinfos/';
const organizationId = 'https://minecraft-gilde.de/#organization';
const gameServerId = 'https://minecraft-gilde.de/#gameserver';

const graphNodes = (data: JsonLdNode): JsonLdNode[] => data['@graph'] as JsonLdNode[];

const nodeByType = (data: JsonLdNode, type: string): JsonLdNode => {
  const node = graphNodes(data).find((entry) => entry['@type'] === type);
  expect(node).toBeDefined();
  return node as JsonLdNode;
};

describe('buildBaseGraph', () => {
  const baseGraph = buildBaseGraph({
    site,
    canonicalUrl,
    pathname: '/serverinfos/',
    title: 'Minecraft Gilde - Serverinfos',
    description: 'Technische Details zur Minecraft Gilde.',
  });

  it('modelliert die Gaming Gilde als Betreiberorganisation', () => {
    const organization = nodeByType(baseGraph, 'Organization');

    expect(organization).toMatchObject({
      '@id': organizationId,
      name: 'Gaming Gilde',
      url: minecraftGilde.organization.url,
    });
  });

  it('verknuepft Website und Inhaltsseite mit den richtigen Entitaeten', () => {
    const website = nodeByType(baseGraph, 'WebSite');
    const webPage = nodeByType(baseGraph, 'WebPage');
    const gameServer = nodeByType(baseGraph, 'GameServer');

    expect(website).not.toHaveProperty('potentialAction');
    expect(gameServer).toMatchObject({
      '@id': gameServerId,
      provider: { '@id': organizationId },
      game: { '@id': 'https://minecraft-gilde.de/#game' },
    });
    expect(webPage).toMatchObject({
      about: { '@id': gameServerId },
      publisher: { '@id': organizationId },
    });
    expect(JSON.stringify(baseGraph)).not.toContain('SearchAction');
  });
});

describe('buildGameServer', () => {
  const gameServerGraph = buildGameServer({
    site,
    canonicalUrl,
    ip: minecraftGilde.serverIp,
    version: minecraftGilde.mcVersion,
  });

  it('modelliert Provider, sameAs und Standort semantisch korrekt', () => {
    const gameServer = nodeByType(gameServerGraph, 'GameServer');
    const sameAs = gameServer.sameAs as string[];

    expect(gameServer).toMatchObject({
      '@id': gameServerId,
      provider: { '@id': organizationId },
    });
    expect(gameServer).not.toHaveProperty('serverLocation');
    expect(sameAs).not.toContain(minecraftGilde.organization.url);
    expect(sameAs).not.toContain(minecraftGilde.mapUrl);
    expect(sameAs).toContain(minecraftGilde.discord.url);
  });
});

describe('bestehende Content-Builder', () => {
  it('erstellt FAQPage-Markup weiterhin mit Fragen und Antworten', () => {
    const faq = buildFaqPage({
      site,
      canonicalUrl: 'https://minecraft-gilde.de/faq/',
      items: [{ q: 'Wie trete ich bei?', a: 'Lies das [Tutorial](/tutorial/).' }],
    });

    expect(faq).toMatchObject({
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Wie trete ich bei?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Lies das Tutorial: https://minecraft-gilde.de/tutorial/.',
          },
        },
      ],
    });
  });

  it('erstellt HowTo-Markup weiterhin in der vorgegebenen Reihenfolge', () => {
    const howTo = buildHowTo({
      canonicalUrl: 'https://minecraft-gilde.de/tutorial/',
      name: 'Minecraft Gilde beitreten',
      description: 'Kurzanleitung',
      steps: [
        { name: 'Minecraft starten', text: 'Starte das Spiel.' },
        { name: 'Server verbinden', text: 'Trage die Serveradresse ein.' },
      ],
    });

    expect(howTo).toMatchObject({
      '@type': 'HowTo',
      step: [
        { '@type': 'HowToStep', position: 1, name: 'Minecraft starten' },
        { '@type': 'HowToStep', position: 2, name: 'Server verbinden' },
      ],
    });
  });

  it('erstellt Article-Markup weiterhin mit WebPage und Publisher', () => {
    const article = buildArticle({
      site,
      canonicalUrl,
      type: 'TechArticle',
      headline: 'Serverinfos',
      description: 'Technische Details',
    });

    expect(article).toMatchObject({
      '@type': 'TechArticle',
      publisher: { '@id': organizationId },
      mainEntityOfPage: { '@id': `${canonicalUrl}#webpage` },
    });
  });
});
