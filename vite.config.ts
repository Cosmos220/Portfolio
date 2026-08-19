import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  /* GitHub Pages sert un projet depuis https://<user>.github.io/<dépôt>/ .
     Sans ce préfixe, toutes les URL d'assets pointeraient à la racine du
     domaine et renverraient des 404.

     La valeur vient du workflow, qui la déduit du nom réel du dépôt : la
     coder en dur casserait au moindre renommage, et empêcherait le
     développement local qui tourne, lui, à la racine. */
  base: process.env.VITE_BASE ?? "/",
  plugins: [vue(), tailwindcss()],
})
