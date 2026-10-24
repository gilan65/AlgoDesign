# Immagine della prova Linux (`bun run prova-linux`): compila l'AppImage e la avvia sotto Xvfb, pilotata
# con tauri-driver. I sorgenti NON stanno nell'immagine: si montano in sola lettura quando servono, e
# dipendenze, compilazione e cache stanno in un volume (vedi `prova.ts`).
FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
# Dipendenze di Tauri 2 per Linux, il driver WebDriver di WebKitGTK, lo schermo virtuale e le due lingue
# del sistema che la prova usa. Senza i pacchetti consigliati, e la lista pulita nello stesso strato.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential ca-certificates curl wget file unzip locales \
      libwebkit2gtk-4.1-dev libxdo-dev libssl-dev librsvg2-dev \
      webkit2gtk-driver xvfb \
 && rm -rf /var/lib/apt/lists/* \
 && locale-gen it_IT.UTF-8 en_US.UTF-8

# Rust e Bun fuori dalla home, che la prova delle tracce guarda.
ENV RUSTUP_HOME=/usr/local/rustup CARGO_HOME=/usr/local/cargo BUN_INSTALL=/usr/local/bun
ENV PATH=/usr/local/cargo/bin:/usr/local/bun/bin:$PATH
RUN curl -fsSL https://sh.rustup.rs | sh -s -- -y --no-modify-path --profile minimal --default-toolchain 1.99.0 \
 && cargo install tauri-driver --version 2.1.0 --locked \
 && rm -rf /usr/local/cargo/registry /usr/local/cargo/git
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.2"
