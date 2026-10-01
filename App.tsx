import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { C, STATUS, Status, PLATFORMS, VIBES, coverFor } from './src/theme';
import { Game, useGames, xpFor, titleFor, FREE_LIMIT } from './src/store';
import { usePro, Plan } from './src/purchases';

type Tab = Status | 'stats';

export default function App() {
  const { games, add, update, remove } = useGames();
  const { pro, plans, buy } = usePro();
  const [tab, setTab] = useState<Tab>('backlog');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Game | null>(null);
  const [paywall, setPaywall] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  if (!games) return <View style={s.root} />;
  const { level, progress, toNext, xp } = xpFor(games);
  const list = tab === 'stats' ? [] : games.filter((g) => g.status === tab);

  const needPro = (reason: string, fn: () => void) => (pro ? fn() : setPaywall(reason));
  const onAdd = () => (games.length >= FREE_LIMIT && !pro ? setPaywall(`Free shelf holds ${FREE_LIMIT} games`) : setAdding(true));

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} stickyHeaderIndices={[1]}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.brand}>QuestLog</Text>
              <Text style={s.sub}>Lv {level} · {titleFor(level)}</Text>
            </View>
            {pro ? (
              <View style={[s.pill, { backgroundColor: C.gold }]}><Text style={[s.pillT, { color: C.bg }]}>PRO</Text></View>
            ) : (
              <Pressable testID="go-pro" onPress={() => setPaywall('Unlock QuestLog Pro')} style={[s.pill, { backgroundColor: C.accent }]}>
                <Text style={s.pillT}>Go Pro</Text>
              </Pressable>
            )}
          </View>
          <XpBar progress={progress} />
          <Text style={s.tiny}>{xp} XP · {toNext} to next level</Text>
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          {(['backlog', 'playing', 'done', 'stats'] as Tab[]).map((t) => {
            const n = t === 'stats' ? null : games.filter((g) => g.status === t).length;
            const active = tab === t;
            return (
              <Pressable key={t} testID={`tab-${t}`} onPress={() => setTab(t)} style={[s.tab, active && s.tabOn]}>
                <Text style={[s.tabT, active && { color: C.text }]}>
                  {t === 'stats' ? 'Stats' : STATUS[t].label}{n !== null ? ` ${n}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'stats' ? (
          <Stats games={games} pro={pro} onPro={() => setPaywall('Deep stats are a Pro feature')} />
        ) : (
          <View style={{ padding: 16, gap: 12 }}>
            {tab === 'backlog' && list.length > 1 && (
              <Pressable testID="roll" onPress={() => needPro('Quest Roll picks your next game', () => setRolling(true))} style={s.roll}>
                <Text style={s.rollIcon}>⚄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.rollT}>Can't decide? Quest Roll</Text>
                  <Text style={s.rollS}>Let fate pick your next adventure{pro ? '' : '  ·  PRO'}</Text>
                </View>
              </Pressable>
            )}
            {list.map((g) => <GameCard key={g.id} g={g} onPress={() => setOpen(g)} />)}
            {!list.length && <Text style={s.empty}>Nothing here yet. {tab === 'backlog' ? 'Tap + to save a game.' : ''}</Text>}
          </View>
        )}
      </ScrollView>

      <Pressable testID="add" onPress={onAdd} style={s.fab}><Text style={s.fabT}>+</Text></Pressable>

      <AddSheet visible={adding} onClose={() => setAdding(false)} onSave={(g) => { add(g); setAdding(false); setTab('backlog'); }} />
      <DetailSheet
        g={open && games.find((x) => x.id === open.id)}
        onClose={() => setOpen(null)}
        onUpdate={(p) => open && update(open.id, p)}
        onRemove={() => { open && remove(open.id); setOpen(null); }}
        onShare={(g) => needPro('Share cards are a Pro feature', () => shareGame(g))}
      />
      <RollSheet visible={rolling} pool={games.filter((g) => g.status === 'backlog')} onClose={() => setRolling(false)}
        onStart={(g) => { update(g.id, { status: 'playing' }); setRolling(false); setTab('playing'); }} />
      <Paywall reason={paywall} plans={plans} onClose={() => setPaywall(null)} onBuy={async (p) => { if (await buy(p)) setPaywall(null); }} />
    </View>
  );
}

function shareGame(g: Game) {
  const stars = '★'.repeat(g.rating) + '☆'.repeat(5 - g.rating);
  const msg = g.status === 'done' ? `Just beat ${g.title} on ${g.platform} — ${stars}\nTracked with QuestLog` : `${g.title} is next on my QuestLog. Who's in?`;
  if (Platform.OS === 'web') (navigator as any).clipboard?.writeText(msg).catch(() => {});
  else Share.share({ message: msg });
}

function XpBar({ progress }: { progress: number }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(w, { toValue: progress, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [progress]);
  return (
    <View style={s.xpTrack}>
      <Animated.View style={[s.xpFill, { width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

function Cover({ title, size = 56 }: { title: string; size?: number }) {
  const [a, b] = coverFor(title);
  return (
    <View style={{ width: size, height: size, borderRadius: 14, backgroundColor: a, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', right: -size * 0.3, bottom: -size * 0.3, width: size, height: size, borderRadius: size, backgroundColor: b, opacity: 0.85 }} />
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: size * 0.38 }}>{title.split(' ').filter((w) => /^[A-Za-z0-9]/.test(w)).map((w) => w[0]).slice(0, 2).join('')}</Text>
    </View>
  );
}

function Stars({ value, onChange, size = 18 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} testID={`star-${n}`} disabled={!onChange} onPress={() => onChange?.(n)}>
          <Text style={{ fontSize: size, color: n <= value ? C.gold : C.line }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

function GameCard({ g, onPress }: { g: Game; onPress: () => void }) {
  return (
    <Pressable testID={`game-${g.title}`} onPress={onPress} style={({ pressed }) => [s.card, pressed && { backgroundColor: C.cardHi }]}>
      <Cover title={g.title} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.cardT} numberOfLines={1}>{g.title}</Text>
        <View style={[s.row, { gap: 6 }]}>
          <Chip label={g.platform} />
          <Chip label={g.vibe} color={C.accent2} />
        </View>
        {g.status === 'done' ? <Stars value={g.rating} size={14} /> : !!g.note && <Text style={s.note} numberOfLines={1}>{g.note}</Text>}
      </View>
      <View style={[s.dot, { backgroundColor: STATUS[g.status].color }]} />
    </Pressable>
  );
}

const Chip = ({ label, color = C.cyan, on, onPress, testID }: { label: string; color?: string; on?: boolean; onPress?: () => void; testID?: string }) => (
  <Pressable testID={testID} disabled={!onPress} onPress={onPress}
    style={[s.chip, { borderColor: color + '66' }, on && { backgroundColor: color, borderColor: color }]}>
    <Text style={[s.chipT, { color: on ? C.bg : color }]}>{label}</Text>
  </Pressable>
);

function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.scrim} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.grab} />
        {children}
      </View>
    </Modal>
  );
}

function AddSheet({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (g: { title: string; platform: string; vibe: string }) => void }) {
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('Switch');
  const [vibe, setVibe] = useState('Cozy');
  useEffect(() => { if (visible) setTitle(''); }, [visible]);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={s.h2}>Save a game</Text>
      <TextInput testID="title-input" value={title} onChangeText={setTitle} placeholder="Game title" placeholderTextColor={C.mute} style={s.input} autoFocus />
      <Text style={s.label}>Platform</Text>
      <View style={s.wrap}>{PLATFORMS.map((p) => <Chip key={p} testID={`plat-${p}`} label={p} on={p === platform} onPress={() => setPlatform(p)} />)}</View>
      <Text style={s.label}>Vibe</Text>
      <View style={s.wrap}>{VIBES.map((v) => <Chip key={v} testID={`vibe-${v}`} label={v} color={C.accent2} on={v === vibe} onPress={() => setVibe(v)} />)}</View>
      <Pressable testID="save" disabled={!title.trim()} onPress={() => onSave({ title: title.trim(), platform, vibe })} style={[s.btn, !title.trim() && { opacity: 0.4 }]}>
        <Text style={s.btnT}>Add to backlog  +10 XP</Text>
      </Pressable>
    </Sheet>
  );
}

function DetailSheet({ g, onClose, onUpdate, onRemove, onShare }: {
  g: Game | null | undefined; onClose: () => void; onUpdate: (p: Partial<Game>) => void; onRemove: () => void; onShare: (g: Game) => void;
}) {
  if (!g) return null;
  return (
    <Sheet visible onClose={onClose}>
      <View style={[s.row, { gap: 14 }]}>
        <Cover title={g.title} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>{g.title}</Text>
          <Text style={s.sub}>{g.platform} · {g.vibe}</Text>
        </View>
      </View>
      <Text style={s.label}>Status</Text>
      <View style={s.wrap}>
        {(Object.keys(STATUS) as Status[]).map((st) => (
          <Chip key={st} testID={`status-${st}`} label={STATUS[st].label} color={STATUS[st].color} on={g.status === st} onPress={() => onUpdate({ status: st })} />
        ))}
      </View>
      {g.status === 'done' && (
        <>
          <Text style={s.label}>Your rating</Text>
          <Stars value={g.rating} size={32} onChange={(rating) => onUpdate({ rating })} />
        </>
      )}
      <Text style={s.label}>Notes</Text>
      <TextInput value={g.note} onChangeText={(note) => onUpdate({ note })} placeholder="Where you left off, who to play with…" placeholderTextColor={C.mute} style={s.input} />
      <View style={[s.row, { gap: 10, marginTop: 8 }]}>
        <Pressable testID="share" onPress={() => onShare(g)} style={[s.btn, { flex: 1, marginTop: 0 }]}><Text style={s.btnT}>Share card</Text></Pressable>
        <Pressable onPress={onRemove} style={[s.btn, { backgroundColor: C.card, marginTop: 0 }]}><Text style={[s.btnT, { color: C.dim }]}>Remove</Text></Pressable>
      </View>
    </Sheet>
  );
}

function RollSheet({ visible, pool, onClose, onStart }: { visible: boolean; pool: Game[]; onClose: () => void; onStart: (g: Game) => void }) {
  const [pick, setPick] = useState<Game | null>(null);
  const [done, setDone] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible || !pool.length) return;
    setDone(false);
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 1600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    let i = 0;
    const t = setInterval(() => { setPick(pool[i++ % pool.length]); }, 110);
    const end = setTimeout(() => { clearInterval(t); setPick(pool[Math.floor(Math.random() * pool.length)]); setDone(true); }, 1600);
    return () => { clearInterval(t); clearTimeout(end); };
  }, [visible]);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1080deg'] });
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
        <Animated.Text style={{ fontSize: 56, color: C.gold, transform: [{ rotate: rot }] }}>⚄</Animated.Text>
        <Text style={s.label}>{done ? 'Your next quest' : 'Rolling…'}</Text>
        {pick && <Cover title={pick.title} size={96} />}
        {pick && <Text style={[s.h2, { textAlign: 'center' }]}>{pick.title}</Text>}
        {done && pick && (
          <Pressable testID="start-quest" onPress={() => onStart(pick)} style={[s.btn, { alignSelf: 'stretch' }]}><Text style={s.btnT}>Start playing  +25 XP</Text></Pressable>
        )}
      </View>
    </Sheet>
  );
}

function Stats({ games, pro, onPro }: { games: Game[]; pro: boolean; onPro: () => void }) {
  const done = games.filter((g) => g.status === 'done');
  const avg = done.length ? (done.reduce((a, g) => a + g.rating, 0) / done.length).toFixed(1) : '–';
  const rate = games.length ? Math.round((done.length / games.length) * 100) : 0;
  const byPlat = useMemo(() => {
    const m: Record<string, number> = {};
    games.forEach((g) => (m[g.platform] = (m[g.platform] ?? 0) + 1));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [games]);
  const max = byPlat[0]?.[1] ?? 1;
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <View style={[s.row, { gap: 12 }]}>
        <Tile k="Completed" v={String(done.length)} c={C.green} />
        <Tile k="Clear rate" v={`${rate}%`} c={C.cyan} />
        <Tile k="Avg rating" v={avg} c={C.gold} />
      </View>
      <View style={s.panel}>
        <Text style={s.label}>Shelf by platform</Text>
        <View style={!pro && { opacity: 0.25 }}>
          {byPlat.map(([p, n]) => (
            <View key={p} style={[s.row, { gap: 10, marginTop: 10 }]}>
              <Text style={[s.sub, { width: 92 }]}>{p}</Text>
              <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: C.bg2 }}>
                <View style={{ width: `${(n / max) * 100}%`, height: 10, borderRadius: 5, backgroundColor: C.accent }} />
              </View>
              <Text style={s.sub}>{n}</Text>
            </View>
          ))}
        </View>
        {!pro && (
          <Pressable testID="stats-pro" onPress={onPro} style={s.lock}><Text style={s.btnT}>Unlock deep stats with Pro</Text></Pressable>
        )}
      </View>
    </View>
  );
}
const Tile = ({ k, v, c }: { k: string; v: string; c: string }) => (
  <View style={[s.panel, { flex: 1, alignItems: 'center', paddingVertical: 18 }]}>
    <Text style={{ color: c, fontSize: 26, fontWeight: '900' }}>{v}</Text>
    <Text style={s.tiny}>{k}</Text>
  </View>
);

function Paywall({ reason, plans, onClose, onBuy }: { reason: string | null; plans: Plan[]; onClose: () => void; onBuy: (p: Plan) => Promise<void> }) {
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (reason) { setSel(0); setBusy(false); } }, [reason]);
  if (!reason) return null;
  const perks = ['Unlimited games on your shelf', 'Quest Roll — let fate pick your next game', 'Shareable completion cards', 'Deep stats & platform insights'];
  const p = plans[sel];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.pay}>
        <Pressable testID="pay-close" onPress={onClose} style={s.close}><Text style={{ color: C.dim, fontSize: 22 }}>✕</Text></Pressable>
        <Text style={s.payBadge}>QUESTLOG PRO</Text>
        <Text style={s.payH}>Finish more games.{'\n'}Feel good doing it.</Text>
        <Text style={[s.sub, { textAlign: 'center', marginBottom: 18 }]}>{reason}</Text>
        {perks.map((t) => (
          <View key={t} style={[s.row, { gap: 10, marginBottom: 10 }]}>
            <Text style={{ color: C.green, fontSize: 18, fontWeight: '900' }}>✓</Text>
            <Text style={{ color: C.text, fontSize: 15 }}>{t}</Text>
          </View>
        ))}
        <View style={{ gap: 10, marginTop: 14 }}>
          {plans.map((pl, i) => (
            <Pressable key={pl.id} testID={`plan-${pl.id}`} onPress={() => setSel(i)} style={[s.plan, i === sel && s.planOn]}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardT}>{pl.title}</Text>
                {!!pl.trial && <Text style={[s.tiny, { color: C.green }]}>{pl.trial}</Text>}
              </View>
              <Text style={s.cardT}>{pl.price}<Text style={s.tiny}> {pl.period}</Text></Text>
              {!!pl.badge && <Text style={s.planBadge}>{pl.badge}</Text>}
            </Pressable>
          ))}
        </View>
        <Pressable testID="buy" disabled={busy} onPress={async () => { setBusy(true); await onBuy(p); setBusy(false); }} style={[s.btn, { backgroundColor: C.gold }]}>
          <Text style={[s.btnT, { color: C.bg }]}>{busy ? 'Processing…' : p.trial ? 'Start free trial' : 'Continue'}</Text>
        </Pressable>
        <Text style={[s.tiny, { textAlign: 'center', marginTop: 10 }]}>Cancel anytime · Restore purchases · Powered by RevenueCat</Text>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  row: { flexDirection: 'row', alignItems: 'center' },
  header: { paddingTop: 58, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: C.bg },
  brand: { color: C.text, fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  sub: { color: C.dim, fontSize: 14 },
  tiny: { color: C.mute, fontSize: 12, marginTop: 6 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  pillT: { color: '#fff', fontWeight: '800', fontSize: 13 },
  xpTrack: { height: 10, backgroundColor: C.card, borderRadius: 5, marginTop: 14, overflow: 'hidden' },
  xpFill: { height: 10, backgroundColor: C.accent, borderRadius: 5 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.bg2 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  tabOn: { backgroundColor: C.card },
  tabT: { color: C.mute, fontWeight: '700', fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, backgroundColor: C.card, borderRadius: 18 },
  cardT: { color: C.text, fontSize: 16, fontWeight: '800' },
  note: { color: C.mute, fontSize: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  chipT: { fontSize: 12, fontWeight: '700' },
  roll: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, backgroundColor: C.accent },
  rollIcon: { fontSize: 34, color: '#fff' },
  rollT: { color: '#fff', fontWeight: '900', fontSize: 16 },
  rollS: { color: '#E5DEFF', fontSize: 12, marginTop: 2 },
  empty: { color: C.mute, textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', right: 22, bottom: 40, width: 64, height: 64, borderRadius: 32, backgroundColor: C.accent2, alignItems: 'center', justifyContent: 'center', shadowColor: C.accent2, shadowOpacity: 0.6, shadowRadius: 16 },
  fabT: { color: '#fff', fontSize: 34, fontWeight: '600', marginTop: -3 },
  scrim: { flex: 1, backgroundColor: '#000a' },
  sheet: { backgroundColor: C.bg2, padding: 20, paddingBottom: 40, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: 8 },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 8 },
  h2: { color: C.text, fontSize: 22, fontWeight: '900' },
  label: { color: C.dim, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 10 },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 14, padding: 14, fontSize: 16, borderWidth: 1, borderColor: C.line },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { backgroundColor: C.accent, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 16 },
  btnT: { color: '#fff', fontWeight: '900', fontSize: 16 },
  panel: { backgroundColor: C.card, borderRadius: 18, padding: 16 },
  lock: { position: 'absolute', left: 16, right: 16, top: '45%', backgroundColor: C.accent, padding: 14, borderRadius: 14, alignItems: 'center' },
  pay: { flex: 1, backgroundColor: C.bg, padding: 24, paddingTop: 70 },
  close: { position: 'absolute', top: 50, right: 22, padding: 8, zIndex: 2 },
  payBadge: { alignSelf: 'center', color: C.gold, fontWeight: '900', letterSpacing: 3, fontSize: 12 },
  payH: { color: C.text, fontSize: 30, fontWeight: '900', textAlign: 'center', marginVertical: 12 },
  plan: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: C.line, backgroundColor: C.card },
  planOn: { borderColor: C.gold },
  planBadge: { position: 'absolute', top: -10, right: 14, backgroundColor: C.gold, color: C.bg, fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
});
