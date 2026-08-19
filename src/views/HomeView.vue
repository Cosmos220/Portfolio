<script setup lang="ts">
import IntroHero from "../components/IntroHero.vue";
import About from "../components/About.vue";
import TechStack from "../components/TechStack.vue";
import MarqueeBand from "../components/MarqueeBand.vue";
import Projects from "../components/Projects.vue";
import CtaFeature from "../components/CtaFeature.vue";
import Testimonials from "../components/Testimonials.vue";
import ContactCta from "../components/ContactCta.vue";
import { offer, testimonials } from "../data/content";
</script>

<template>
  <IntroHero />
  <About />
  <TechStack />
  <MarqueeBand />
  <Projects />
  <CtaFeature v-if="offer.title" />
  <Testimonials v-if="testimonials.length" />
  <ContactCta />
</template>
