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
const gameId = 'https://minecraft-gilde.de/#game';
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
    expect(website).toMatchObject({
      publisher: { '@id': organizationId },
    });
    expect(gameServer).toMatchObject({
      '@id': gameServerId,
      game: { '@id': gameId },
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
  });

  it('modelliert Identität, Verknüpfungen und sameAs semantisch korrekt', () => {
    const gameServer = nodeByType(gameServerGraph, 'GameServer');
    const sameAs = gameServer.sameAs as string[];

    expect(gameServer).toMatchObject({
      '@id': gameServerId,
      name: minecraftGilde.brand.name,
      alternateName: minecraftGilde.brand.alternateName,
      url: 'https://minecraft-gilde.de/',
      description: minecraftGilde.server.description,
      game: { '@id': gameId },
    });
    expect(gameServer).not.toHaveProperty('additionalProperty');
    expect(gameServer).not.toHaveProperty('availableLanguage');
    expect(gameServer).not.toHaveProperty('provider');
    expect(gameServer).not.toHaveProperty('owner');
    expect(gameServer).not.toHaveProperty('serverLocation');
    expect(sameAs).not.toContain(minecraftGilde.organization.url);
    expect(sameAs).not.toContain(minecraftGilde.mapUrl);
    expect(sameAs).toContain(minecraftGilde.discord.url);
  });

  it('transportiert die stabilen Servermerkmale in der zentralen Beschreibung', () => {
    const gameServer = nodeByType(gameServerGraph, 'GameServer');
    const description = gameServer.description as string;

    expect(description).toBe(minecraftGilde.server.description);
    expect(description).toContain('Java');
    expect(description).toContain('Folia');
    expect(description).toContain('ohne Pay2Win');
    expect(description).toContain('ohne Hauptwelt-Reset');
    expect(description).toContain('Langzeitwelt');
    expect(description).toContain('Grundstücksschutz');
    expect(description).toContain('separaten Farmwelten');
  });

  it('verwendet dieselben zentralen Basiswerte wie buildBaseGraph', () => {
    const baseGraph = buildBaseGraph({
      site,
      canonicalUrl,
      pathname: '/serverinfos/',
      title: 'Minecraft Gilde - Serverinfos',
      description: 'Technische Details zur Minecraft Gilde.',
    });
    const baseGameServer = nodeByType(baseGraph, 'GameServer');
    const detailedGameServer = nodeByType(gameServerGraph, 'GameServer');

    expect(detailedGameServer).toMatchObject(baseGameServer);
  });

  it('hält server-spezifische Aussagen vom VideoGame-Knoten fern', () => {
    const videoGame = nodeByType(gameServerGraph, 'VideoGame');

    expect(videoGame).toEqual({
      '@type': 'VideoGame',
      '@id': gameId,
      name: 'Minecraft',
      gameServer: { '@id': gameServerId },
    });
    expect(videoGame).not.toHaveProperty('inLanguage');
    expect(videoGame).not.toHaveProperty('keywords');
    expect(videoGame).not.toHaveProperty('image');
    expect(videoGame).not.toHaveProperty('genre');
    expect(videoGame).not.toHaveProperty('gamePlatform');
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
