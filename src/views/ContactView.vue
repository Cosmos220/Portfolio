<script setup lang="ts">
import { computed } from "vue";
import { profile, socials } from "../data/content";
import Reveal from "../components/Reveal.vue";
import TypeLine from "../components/ui/TypeLine.vue";
import CvActions from "../components/CvActions.vue";
import TraceRoute from "../components/TraceRoute.vue";

const mailto = computed(
  () =>
    `mailto:${profile.email}?subject=${encodeURIComponent(
      "Prise de contact",
    )}&body=${encodeURIComponent(`Bonjour ${profile.firstName},\n\n`)}`,
);

const coords = computed(() => [
  { label: "E-mail", value: profile.email, href: mailto.value },
  { label: "Localisation", value: profile.location, href: null as string | null },
]);
</script>

<template>
  <section class="pt-28 pb-20 sm:pt-32 sm:pb-28">
    <div class="mx-auto w-full max-w-5xl px-5 sm:px-8">
      <Reveal>
        <p class="font-pixel text-xs uppercase tracking-[0.08em] text-accent">
          <TypeLine :text="'// Contactez-moi'" />
        </p>
        <h1 class="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Discutons ensemble.
        </h1>
        <p class="mt-6 max-w-xl text-base leading-relaxed text-muted">
          {{ profile.availabilityLong }}
        </p>
      </Reveal>

      <div class="mt-14 grid gap-10 md:grid-cols-[1.2fr_1fr]">
        <!-- Action principale -->
        <Reveal>
          <div class="panel p-8 sm:p-10">
            <h2 class="text-xl font-medium tracking-tight">
              Le plus rapide : par e-mail
            </h2>
            <p class="mt-3 text-[15px] leading-relaxed text-muted">
              Une question, une offre de stage ou d'alternance, ou simplement
              pour échanger — ma boîte mail est ouverte.
            </p>
            <a
              :href="mailto"
              class="btn-primary mt-7"
            >
              Ouvrir ma boîte mail
              <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>

            <div class="mt-6">
              <CvActions />
            </div>
          </div>
        </Reveal>

        <!-- Coordonnées + réseaux -->
        <Reveal :delay="40">
          <div>
            <TraceRoute class="mb-8" />
          <dl class="space-y-6">
            <div v-for="c in coords" :key="c.label">
              <dt class="font-pixel text-xs uppercase tracking-[0.06em] text-muted-2">
                {{ c.label }}
              </dt>
              <dd class="mt-1 text-[15px]">
                <a
                  v-if="c.href"
                  :href="c.href"
                  class="text-foreground underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-accent"
                >
                  {{ c.value }}
                </a>
                <span v-else class="text-foreground">{{ c.value }}</span>
              </dd>
            </div>

            <div>
              <dt class="font-pixel text-xs uppercase tracking-[0.06em] text-muted-2">
                Réseaux
              </dt>
              <dd class="mt-3 flex flex-wrap gap-2">
                <a
                  v-for="s in socials"
                  :key="s.label"
                  :href="s.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  {{ s.label }}
                </a>
              </dd>
            </div>
          </dl>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
</template>
