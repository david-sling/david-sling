/*
 * Draws the profile README's cards: the intro card and the tile grid from
 * davidsling.in's hero, rebuilt as static SVGs because a README can't run
 * CSS or JS. Each card renders once per GitHub theme, and each tile carries
 * half the grid gap as transparent margin, so tiles placed edge to edge in
 * the README sit a full gap apart.
 *
 * Fonts and project marks are read from the portfolio repo
 * (they aren't redistributed here). Point PORTFOLIO at it if it isn't a
 * sibling folder:  PORTFOLIO=../davidsling.in npm run render
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const portfolio = resolve(root, process.env.PORTFOLIO ?? '../davidsling.in')
const asset = (p) => readFileSync(resolve(portfolio, 'src/og-assets', p))
const dataUrl = (buf, type) => `data:${type};base64,${buf.toString('base64')}`

const fonts = [
  { name: 'General Sans', data: asset('general-sans-500.ttf'), weight: 500 },
  { name: 'General Sans', data: asset('general-sans-600.ttf'), weight: 600 },
]

/* ---------- colour: the site's OKLCH tokens, converted for satori ---------- */

function oklch(L, C, h, alpha = 1) {
  const r = (h * Math.PI) / 180
  const a = C * Math.cos(r)
  const b = C * Math.sin(r)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  const [R, G, B] = lin.map((v) => {
    const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
    return Math.round(Math.min(1, Math.max(0, c)) * 255)
  })
  return alpha === 1 ? `rgb(${R},${G},${B})` : `rgba(${R},${G},${B},${alpha})`
}

// Project tiles in dark mode: the site's near-black tile.
const night = {
  fill: oklch(0.21, 0.014, 245),
  ink: oklch(0.95, 0.006, 225),
  ink2: oklch(0.76, 0.01, 230),
  ink3: oklch(0.64, 0.01, 235),
}

// GitHub's page is white or #0d1117, so the light sheet steps down to the
// site's ground colour to stay visible, and dark sheets get a hairline.
const themes = {
  light: {
    sheet: oklch(0.962, 0.004, 225),
    sunk: oklch(0.993, 0.002, 225),
    line: oklch(0.89, 0.006, 225),
    ink: oklch(0.21, 0.014, 245),
    ink3: oklch(0.58, 0.01, 245),
    blueText: oklch(0.47, 0.1, 224),
  },
  dark: {
    sheet: oklch(0.205, 0.012, 245),
    sunk: oklch(0.185, 0.011, 245),
    line: oklch(0.3, 0.012, 245),
    ink: oklch(0.95, 0.006, 225),
    ink3: oklch(0.64, 0.01, 235),
    blueText: oklch(0.83, 0.1, 214),
    nightEdge: oklch(0.3, 0.012, 245),
  },
}

const blue = oklch(0.81, 0.105, 214)
const brand = { wave: '#f8c840', offlyn: '#ff6b9f', equanim: '#06b6d4' }
// Each project's deep ink, the site's --*-deep tokens: text that reads on its colour.
const deep = {
  wave: [0.22, 0.04, 85],
  offlyn: [0.24, 0.06, 0],
  equanim: [0.2, 0.035, 225],
}

/**
 * A project tile's palette. Dark mode keeps the site's near-black tile with
 * the name in the project's colour; light mode fills the tile with that
 * colour and sets everything in the project's deep ink, as the OG cards do.
 */
function projectPalette(theme, key) {
  if (theme === 'dark') {
    return { ...night, name: brand[key], edge: themes.dark.nightEdge, chip: false }
  }
  const ink = (a = 1) => oklch(...deep[key], a)
  return {
    fill: brand[key],
    ink: ink(),
    ink2: ink(0.82),
    ink3: ink(0.66),
    name: ink(),
    edge: 'rgba(0,0,0,0)',
    chip: true,
  }
}

/* ---------- a tiny element helper, so this needs no JSX build ---------- */

function h(type, style, ...children) {
  const kids = children.flat().filter((c) => c != null && c !== false)
  return { type, props: { style, children: kids.length === 1 ? kids[0] : kids } }
}
const div = (style, ...c) => h('div', { display: 'flex', ...style }, ...c)
const img = (src, w, ht, style) => ({ type: 'img', props: { src, width: w, height: ht, style } })
const svg = (w, ht, viewBox, body, style) => ({
  type: 'svg',
  props: { width: w, height: ht, viewBox, fill: 'none', style, children: body },
})
const path = (d, attrs = {}) => ({ type: 'path', props: { d, ...attrs } })

/* ---------- icons: lucide strokes and brand marks ---------- */

const stroke = (color, w = 2) => ({
  stroke: color,
  strokeWidth: w,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
})
const arrow = (color, external) =>
  svg(
    20,
    20,
    '0 0 24 24',
    (external ? ['M7 7h10v10', 'M7 17 17 7'] : ['M5 12h14', 'm12 5 7 7-7 7']).map((d) =>
      path(d, stroke(color)),
    ),
    { opacity: 0.6 },
  )
const fileText = (color) =>
  svg(
    22,
    22,
    '0 0 24 24',
    [
      'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
      'M14 2v4a2 2 0 0 0 2 2h4',
      'M10 9H8',
      'M16 13H8',
      'M16 17H8',
    ].map((d) => path(d, stroke(color))),
  )
const mail = (color) =>
  svg(
    18,
    18,
    '0 0 24 24',
    [
      path('M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', stroke(color)),
      path('m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7', stroke(color)),
    ],
  )
const pen = (color) =>
  svg(
    18,
    18,
    '0 0 24 24',
    [
      'M12 20h9',
      'M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z',
    ].map((d) => path(d, stroke(color))),
  )
const linkedin = (color) =>
  svg(18, 18, '0 0 24 24', [
    path(
      'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.847 3.37-1.847 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
      { fill: color },
    ),
  ])
const instagram = (color) =>
  svg(18, 18, '0 0 24 24', [
    path('M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z', stroke(color)),
    path('M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z', stroke(color)),
    path('M17.5 6.5h.01', stroke(color, 2.5)),
  ])

/* ---------- the Equanim trace: the site's double pendulum, integrated once ---------- */

function pendulumTrace() {
  const g = 9.81
  const derive = ([t1, t2, w1, w2]) => {
    const d = t1 - t2
    const den = 3 - Math.cos(2 * d)
    const a1 =
      (-g * 3 * Math.sin(t1) - g * Math.sin(t1 - 2 * t2) - 2 * Math.sin(d) * (w2 * w2 + w1 * w1 * Math.cos(d))) / den
    const a2 = (2 * Math.sin(d) * (w1 * w1 * 2 + g * 2 * Math.cos(t1) + w2 * w2 * Math.cos(d))) / den
    return [w1, w2, a1, a2]
  }
  const step = (s, dt) => {
    const add = (a, b, k) => a.map((v, i) => v + b[i] * k)
    const k1 = derive(s)
    const k2 = derive(add(s, k1, dt / 2))
    const k3 = derive(add(s, k2, dt / 2))
    const k4 = derive(add(s, k3, dt))
    return s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]))
  }
  let s = [2.2, 2.6, 0, 0]
  const pts = []
  for (let i = 0; i < 2400; i++) {
    s = step(s, 1 / 240)
    const x = Math.sin(s[0]) + Math.sin(s[1])
    const y = Math.cos(s[0]) + Math.cos(s[1])
    pts.push(`${(100 + x * 46).toFixed(1)} ${(100 + y * 46).toFixed(1)}`)
  }
  return `M${pts.join('L')}`
}

/* ---------- cards ---------- */

const UNIT = 216 // one grid column; the README is four across
const GAP = 12
const font = { fontFamily: 'General Sans', fontWeight: 500 }

/**
 * A tile's outer box: transparent margin of half a gap on the top and sides.
 * There's none below, because the README's line breaks already leave about
 * that much space under each row of inline images.
 */
function frame(w, ht, face) {
  return div(
    { width: w, height: ht - GAP / 2, position: 'relative', ...font },
    div({ position: 'absolute', top: GAP / 2, left: GAP / 2, right: GAP / 2, bottom: 0 }, face),
  )
}

const faceBase = {
  flex: 1,
  flexDirection: 'column',
  justifyContent: 'space-between',
  borderRadius: 26,
  padding: 20,
  overflow: 'hidden',
  position: 'relative',
}

const HERO_H = 268

function hero(t) {
  return frame(
    UNIT * 4,
    HERO_H,
    div(
      {
        ...faceBase,
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderRadius: 36,
        padding: '0 44px 40px 48px',
        background: t.sheet,
        border: `1px solid ${t.line}`,
      },
      div(
        { flexDirection: 'column' },
        // The site's sticker leads the headline. No portrait: the profile has one.
        div(
          { alignSelf: 'flex-start', marginLeft: -4 },
          div(
            {
              padding: '7px 15px',
              borderRadius: 999,
              background: t.ink,
              color: t.sheet,
              fontSize: 15,
              fontWeight: 600,
              transform: 'rotate(-5deg)',
              boxShadow: '0 10px 20px -10px rgba(20,26,34,0.6)',
            },
            'Hi, I’m David',
          ),
        ),
        div(
          {
            marginTop: 20,
            flexDirection: 'column',
            fontSize: 60,
            fontWeight: 600,
            lineHeight: 1.0,
            letterSpacing: '-0.035em',
            color: t.ink,
          },
          div({}, 'Engineer with a'),
          div({}, 'designer’s eye.'),
        ),
      ),
      div(
        { flexDirection: 'column', marginLeft: 'auto', width: 290, paddingBottom: 6 },
        div(
          { fontSize: 18, lineHeight: 1.35, letterSpacing: '-0.01em', color: t.ink3 },
          'I build real products with AI agents, and sweat the details they miss.',
        ),
        div(
          { marginTop: 16, alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: t.blueText },
          'davidsling.in',
          arrow(t.blueText, true),
        ),
      ),
    ),
  )
}

const projectFace = (p, style) => ({
  ...faceBase,
  background: p.fill,
  color: p.ink,
  border: `1px solid ${p.edge}`,
  ...style,
})

/** A project's mark. On its own colour it sits on a white tile so it still reads. */
function mark(p, content, size, radius) {
  if (!p.chip) return content
  return div(
    {
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius,
      background: '#ffffff',
      boxShadow: '0 14px 28px -14px rgba(0,0,0,0.35)',
    },
    content,
  )
}

const label = (text, color) => div({ fontSize: 13, fontWeight: 600, color }, text)

function wave(t, theme) {
  const p = projectPalette(theme, 'wave')
  const hand = p.chip ? 64 : 88
  return frame(
    UNIT * 2,
    UNIT,
    div(
      projectFace(p, { flexDirection: 'row', alignItems: 'stretch', padding: 22 }),
      div(
        { width: 150, alignItems: 'center', justifyContent: 'center' },
        mark(
          p,
          img(dataUrl(asset('wave.png'), 'image/png'), hand, hand, { transform: 'rotate(-8deg)' }),
          104,
          30,
        ),
      ),
      div(
        { flex: 1, flexDirection: 'column', justifyContent: 'space-between', marginLeft: 8 },
        div({ justifyContent: 'flex-end' }, arrow(p.ink, false)),
        div(
          { flexDirection: 'column' },
          label('Project', p.ink3),
          div({ fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em', color: p.name }, 'Wave'),
          div(
            { marginTop: 4, fontSize: 15, lineHeight: 1.3, color: p.ink2 },
            'Group chat for AI coding agents, while you supervise.',
          ),
        ),
      ),
    ),
  )
}

function offlyn(t, theme) {
  const p = projectPalette(theme, 'offlyn')
  return frame(
    UNIT,
    UNIT,
    div(
      projectFace(p),
      div({ justifyContent: 'flex-end' }, arrow(p.ink, false)),
      div(
        { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -8 },
        mark(p, img(dataUrl(asset('offlyn.svg'), 'image/svg+xml'), 40, 32), 64, 20),
      ),
      div(
        { flexDirection: 'column' },
        label('Project', p.ink3),
        div({ fontSize: 21, fontWeight: 600, letterSpacing: '-0.02em', color: p.name }, 'offlyn.love'),
        div({ fontSize: 13.5, lineHeight: 1.3, color: p.ink2 }, 'Dating through friends of friends'),
      ),
    ),
  )
}

function equanim(t, theme) {
  const p = projectPalette(theme, 'equanim')
  return frame(
    UNIT,
    UNIT,
    div(
      projectFace(p),
      svg(
        170,
        170,
        '0 0 200 200',
        [path(pendulumTrace(), { stroke: p.ink, strokeWidth: 0.9, strokeOpacity: p.chip ? 0.3 : 0.24 })],
        { position: 'absolute', right: -46, top: -58 },
      ),
      div({ justifyContent: 'flex-end' }, arrow(p.ink, false)),
      div(
        { flexDirection: 'column' },
        label('Playground', p.ink3),
        div({ fontSize: 21, fontWeight: 600, letterSpacing: '-0.02em', color: p.name }, 'Equanim'),
        div({ fontSize: 13.5, lineHeight: 1.3, color: p.ink2 }, 'Animation as maths'),
      ),
    ),
  )
}

const sheetFace = (t, style) => ({
  ...faceBase,
  background: t.sheet,
  color: t.ink,
  border: `1px solid ${t.line}`,
  ...style,
})

function post(t) {
  return frame(
    UNIT * 2,
    UNIT,
    div(
      sheetFace(t, { padding: 22 }),
      div(
        { justifyContent: 'space-between', alignItems: 'flex-start' },
        div({ fontSize: 13.5, color: t.ink3 }, 'Latest writing · Mar 2026'),
        arrow(t.ink, false),
      ),
      div(
        { flexDirection: 'column' },
        div(
          { fontSize: 23, fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.02em', maxWidth: 340 },
          'I Vibecoded a Full Stack App. Here’s How it Went.',
        ),
        div(
          { marginTop: 6, fontSize: 14, lineHeight: 1.35, color: t.ink3, maxWidth: 360 },
          'SQL as the API, Three.js to raw WebGL, and the rules I wish I had started with.',
        ),
      ),
    ),
  )
}

const iconChip = (t, icon, size = 44) =>
  div(
    {
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: size * 0.3,
      background: t.sunk,
      border: `1px solid ${t.line}`,
    },
    icon,
  )

function resume(t) {
  return frame(
    UNIT,
    UNIT,
    div(
      sheetFace(t),
      div({ justifyContent: 'space-between', alignItems: 'flex-start' }, iconChip(t, fileText(t.blueText), 48), arrow(t.ink, true)),
      div(
        { flexDirection: 'column' },
        div({ fontSize: 21, fontWeight: 600, letterSpacing: '-0.02em' }, 'Resume'),
        div({ fontSize: 14.5, color: t.ink3 }, 'PDF'),
      ),
    ),
  )
}

function sayHi(t, theme) {
  const tint = theme === 'light' ? oklch(0.93, 0.045, 214) : oklch(0.27, 0.045, 220)
  const edge = theme === 'light' ? oklch(0.85, 0.07, 214) : oklch(0.4, 0.06, 216)
  return frame(
    UNIT,
    UNIT,
    div(
      { ...faceBase, background: tint, color: t.ink, border: `1px solid ${edge}` },
      div(
        { justifyContent: 'space-between', alignItems: 'flex-start' },
        div({ fontSize: 21, fontWeight: 600, letterSpacing: '-0.02em' }, 'Say hi'),
        div(
          { width: 44, height: 44, borderRadius: 999, background: blue, alignItems: 'center', justifyContent: 'center' },
          mail(oklch(0.21, 0.014, 245)),
        ),
      ),
      div(
        { flexDirection: 'column' },
        div({ fontSize: 13.5, color: t.blueText }, 'Email me'),
        div({ fontSize: 15.5, fontWeight: 600, marginTop: 2 }, 'me@davidsling.in'),
      ),
    ),
  )
}

/** The socials strip: the site's stacked socials tile, laid on its side. */
function social(t, name, icon) {
  return frame(
    (UNIT * 4) / 3,
    96,
    div(
      sheetFace(t, { flexDirection: 'row', alignItems: 'center', padding: '0 20px', borderRadius: 22 }),
      iconChip(t, icon(t.ink), 38),
      div({ flex: 1, marginLeft: 14, fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em' }, name),
      arrow(t.ink, true),
    ),
  )
}

/* ---------- render ---------- */

const cards = {
  hero: [UNIT * 4, HERO_H, hero],
  wave: [UNIT * 2, UNIT, wave],
  offlyn: [UNIT, UNIT, offlyn],
  equanim: [UNIT, UNIT, equanim],
  post: [UNIT * 2, UNIT, post],
  resume: [UNIT, UNIT, resume],
  email: [UNIT, UNIT, sayHi],
  writing: [(UNIT * 4) / 3, 96, (t) => social(t, 'All writing', pen)],
  linkedin: [(UNIT * 4) / 3, 96, (t) => social(t, 'LinkedIn', linkedin)],
  instagram: [(UNIT * 4) / 3, 96, (t) => social(t, 'Instagram', instagram)],
}

const out = resolve(root, 'cards')
mkdirSync(out, { recursive: true })

for (const [theme, t] of Object.entries(themes)) {
  for (const [name, [width, height, draw]] of Object.entries(cards)) {
    const markup = await satori(draw(t, theme), { width, height: height - GAP / 2, fonts })
    writeFileSync(resolve(out, `${name}-${theme}.svg`), markup)
    if (process.env.PREVIEW) {
      const png = new Resvg(markup, { fitTo: { mode: 'width', value: width * 2 } }).render().asPng()
      writeFileSync(resolve(process.env.PREVIEW, `${name}-${theme}.png`), png)
    }
  }
}
console.log(`Rendered ${Object.keys(cards).length * 2} cards to cards/`)
