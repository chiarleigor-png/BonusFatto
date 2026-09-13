import { useEffect, useState, useMemo, useRef } from "react";
const bonusLogo = "/bonusfatto_logo.png";
const sunLogo = "/logo.webp";
import { BLOG_ARTICLES } from "./blogData";
// logo via public folder
const bonusLogo = "/bonusfatto_logo.png";
const sunLogo = "/logo.webp";

type ComuneRaw = any;
type ComuneNorm = { nome: string; provincia: string; regione: string };

const REGIONI = [
  "Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna",
  "Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche",
  "Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana",
  "Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto"
];

const PROVINCE_PER_REGIONE: Record<string,string[]> = {
  "Abruzzo": ["Chieti","L'Aquila","Pescara","Teramo"],
  "Basilicata": ["Matera","Potenza"],
  "Calabria": ["Catanzaro","Cosenza","Crotone","Reggio Calabria","Vibo Valentia"],
  "Campania": ["Avellino","Benevento","Caserta","Napoli","Salerno"],
  "Emilia-Romagna": ["Bologna","Ferrara","Forlì-Cesena","Modena","Parma","Piacenza","Ravenna","Reggio Emilia","Rimini"],
  "Friuli-Venezia Giulia": ["Gorizia","Pordenone","Trieste","Udine"],
  "Lazio": ["Frosinone","Latina","Rieti","Roma","Viterbo"],
  "Liguria": ["Genova","Imperia","La Spezia","Savona"],
  "Lombardia": ["Bergamo","Brescia","Como","Cremona","Lecco","Lodi","Mantova","Milano","Monza e della Brianza","Pavia","Sondrio","Varese"],
  "Marche": ["Ancona","Ascoli Piceno","Fermo","Macerata","Pesaro e Urbino"],
  "Molise": ["Campobasso","Isernia"],
