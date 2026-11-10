/* Notifications système : de courts messages empilés en haut à droite, qui
   s'effacent d'eux-mêmes.

   Elles ne servent qu'à ce qui se passe réellement (on change de quartier, de
   nouvelles données sont atteintes pour la première fois). Un message qui
   apparaîtrait sans cause serait du bruit — et un portfolio présenté à des
   recruteurs n'a pas besoin de bruit. */
import { reactive } from "vue";

export type Notif = {
  id: number;
  title: string;
  text?: string;
  /* « alert » passe le filet en rouge : réservé aux anomalies. */
  kind: "info" | "alert";
};

export const notifs = reactive<Notif[]>([]);

const MAX = 3;
const TTL = 4200;
let seq = 0;

export function notify(n: Omit<Notif, "id" | "kind"> & { kind?: Notif["kind"] }) {
  const id = ++seq;
  notifs.push({ id, kind: "info", ...n });
  /* Au-delà du plafond, la plus ancienne part : la pile ne doit jamais
     recouvrir le contenu. */
  while (notifs.length > MAX) notifs.shift();
  window.setTimeout(() => dismiss(id), TTL);
  return id;
}

export function dismiss(id: number) {
  const i = notifs.findIndex((n) => n.id === id);
  if (i >= 0) notifs.splice(i, 1);
}
