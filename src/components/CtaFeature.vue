<script setup lang="ts">
import { offer, profile } from "../data/content";
import Reveal from "./Reveal.vue";
import TypeLine from "./ui/TypeLine.vue";
</script>

<template>
  <section class="border-t border-border py-20 sm:py-28">
    <div class="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <Reveal>
        <div
          class="panel relative overflow-hidden p-8 sm:p-12 lg:p-16"
        >
          <div
            aria-hidden="true"
            class="dither-field pointer-events-none absolute -right-20 -top-24 h-80 w-80 opacity-[0.12]"
          />

          <div
            class="relative grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-end"
          >
            <div>
              <p class="font-pixel text-xs uppercase tracking-[0.08em] text-accent">
                <TypeLine :text="offer.eyebrow" />
              </p>
              <h2
                class="mt-5 max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
              >
                {{ offer.title }}
              </h2>
              <p
                class="mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base"
              >
                {{ offer.description }}
              </p>
            </div>

            <div class="lg:pb-2">
              <ul class="space-y-3">
                <li
                  v-for="(b, i) in offer.bullets"
                  :key="i"
                  class="flex items-start gap-3 text-sm"
                >
                  <span
                    class="mt-2 h-1.5 w-1.5 shrink-0 bg-accent"
                  />
                  <span class="text-foreground/90">{{ b }}</span>
                </li>
              </ul>

              <a
                :href="profile.calLink"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-primary mt-8"
              >
                {{ offer.ctaLabel }}
                <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
</template>
