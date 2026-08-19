<script setup lang="ts">
import { about, profile } from "../data/content";
import Reveal from "./Reveal.vue";
import TypeLine from "./ui/TypeLine.vue";
import CvActions from "./CvActions.vue";
</script>

<template>
  <section id="about" class="relative border-t border-border py-20 sm:py-28">
    <div class="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <div class="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <!-- GAUCHE : titre + fiche -->
        <Reveal>
          <div class="lg:sticky lg:top-28">
            <p class="font-pixel text-xs uppercase tracking-[0.08em] text-accent">
              <TypeLine :text="about.eyebrow" />
            </p>
            <h2
              class="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {{ about.heading }}
            </h2>

            <dl class="mt-9 border-t border-border">
              <div
                v-for="f in about.facts"
                :key="f.label"
                class="flex items-baseline justify-between gap-6 border-b border-border py-3.5"
              >
                <dt
                  class="font-pixel text-[11px] uppercase tracking-[0.06em] text-muted-2"
                >
                  {{ f.label }}
                </dt>
                <dd class="text-right text-sm text-foreground">{{ f.value }}</dd>
              </div>
            </dl>
          </div>
        </Reveal>

        <!-- DROITE : bio -->
        <Reveal :delay="40">
          <div class="space-y-6">
            <p
              v-for="(para, i) in profile.bio"
              :key="i"
              :class="i === 0
                  ? 'text-lg leading-relaxed text-foreground/90 sm:text-xl'
                  : 'text-[15px] leading-relaxed text-muted sm:text-base'
              "
            >
              {{ para }}
            </p>
          </div>

          <div class="mt-9 flex flex-wrap items-center gap-3">
            <RouterLink to="/contact" class="btn-ghost">
              Me contacter
              <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </RouterLink>
            <CvActions />
          </div>
        </Reveal>
      </div>
    </div>
  </section>
</template>
