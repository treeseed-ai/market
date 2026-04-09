/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    runtime?: import('@treeseed/core/types/cloudflare').CloudflareRuntime;
  }
}
