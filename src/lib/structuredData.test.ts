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

const additionalProperties = (gameServer: JsonLdNode): Map<string, string> =>
  new Map(
    (gameServer.additionalProperty as JsonLdNode[]).map((property) => [
      property.name as string,
      property.value as string,
    ]),
  );

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
      provider: { '@id': organizationId },
      game: { '@id': gameId },
      availableLanguage: ['de'],
    });
    expect(gameServer).not.toHaveProperty('serverLocation');
    expect(sameAs).not.toContain(minecraftGilde.organization.url);
    expect(sameAs).not.toContain(minecraftGilde.mapUrl);
    expect(sameAs).toContain(minecraftGilde.discord.url);
  });

  it('enthält die stabilen Servereigenschaften aus der zentralen Konfiguration', () => {
    const properties = additionalProperties(nodeByType(gameServerGraph, 'GameServer'));

    expect(properties).toEqual(
      new Map([
        ['Edition', minecraftGilde.server.edition],
        ['Server-Software', minecraftGilde.server.software],
        ['Version', minecraftGilde.mcVersion],
        ['Spielmodus', minecraftGilde.server.gameMode],
        ['Pay2Win', 'nein'],
        ['Hauptwelt-Reset', 'nein'],
        ['Langzeitwelt', 'ja'],
        ['Claims / Grundstücksschutz', 'ja'],
        ['Separate Farmwelten', 'ja'],
        ['Whitelist', 'nein'],
        ['Serveradresse', minecraftGilde.serverIp],
        ['Port', String(minecraftGilde.server.port)],
      ]),
    );
  });

  it('ergänzt Max. Spieler nur bei einem übergebenen Wert', () => {
    const withoutMaxPlayers = additionalProperties(nodeByType(gameServerGraph, 'GameServer'));
    const withMaxPlayers = additionalProperties(
      nodeByType(buildGameServer({ site, canonicalUrl, maxPlayers: 100 }), 'GameServer'),
    );

    expect(withoutMaxPlayers.has('Max. Spieler')).toBe(false);
    expect(withMaxPlayers.get('Max. Spieler')).toBe('100');
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
