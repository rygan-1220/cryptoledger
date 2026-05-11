<template>
  <div class="min-h-screen">
    <header class="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-ocean to-ember"></div>
        <div>
          <p class="text-sm uppercase tracking-[0.3em] text-mist/60">CryptoLedger</p>
          <p class="text-lg font-semibold text-mist">Secure expense intelligence</p>
        </div>
      </div>
      <button
        class="rounded-full border border-mist/20 px-4 py-2 text-sm text-mist/80 transition hover:border-mist/40"
      >
        Launch console
      </button>
    </header>

    <main class="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 md:grid-cols-[1.1fr_0.9fr]">
      <section class="space-y-6">
        <p class="text-sm uppercase tracking-[0.4em] text-mist/60">Trusted reimbursement</p>
        <h1 class="text-4xl font-semibold leading-tight text-mist md:text-5xl">
          End-to-end encrypted expense workflows with audit-grade integrity.
        </h1>
        <p class="text-base text-mist/70 md:text-lg">
          CryptoLedger keeps sensitive vendor data encrypted while delivering real-time
          analytics to finance teams. Two-layer AES, RSA key wrapping, and hash-chain
          verification are built in from day one.
        </p>
        <div class="flex flex-wrap gap-4">
          <button
            class="rounded-full bg-ocean px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:scale-[1.02]"
          >
            Start sprint 1
          </button>
          <button
            class="rounded-full border border-mist/30 px-6 py-3 text-sm font-semibold text-mist/80 transition hover:border-mist/60"
          >
            View architecture
          </button>
        </div>
        <div class="grid gap-4 md:grid-cols-3">
          <div class="glass rounded-2xl p-4">
            <p class="text-sm text-mist/60">Pattern layer</p>
            <p class="text-lg font-semibold text-mist">Stats without exposure</p>
          </div>
          <div class="glass rounded-2xl p-4">
            <p class="text-sm text-mist/60">Hash chain</p>
            <p class="text-lg font-semibold text-mist">Tamper detection</p>
          </div>
          <div class="glass rounded-2xl p-4">
            <p class="text-sm text-mist/60">Role gates</p>
            <p class="text-lg font-semibold text-mist">Least-privilege access</p>
          </div>
        </div>
      </section>

      <section class="glass rounded-3xl p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-mist/60">Expense overview</p>
            <p class="text-2xl font-semibold text-mist">April 2026</p>
          </div>
          <span class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
            98% verified
          </span>
        </div>

        <div class="mt-6 space-y-4">
          <div class="rounded-2xl border border-mist/10 bg-ink/40 p-4">
            <p class="text-xs uppercase tracking-[0.3em] text-mist/50">Pending</p>
            <p class="text-2xl font-semibold text-mist">MYR 124,500</p>
            <p class="text-sm text-mist/60">27 submissions awaiting review</p>
          </div>
          <div class="rounded-2xl border border-mist/10 bg-ink/40 p-4">
            <p class="text-xs uppercase tracking-[0.3em] text-mist/50">Approved</p>
            <p class="text-2xl font-semibold text-mist">MYR 892,100</p>
            <p class="text-sm text-mist/60">Securely released to payroll</p>
          </div>
          <div class="rounded-2xl border border-mist/10 bg-ink/40 p-4">
            <p class="text-xs uppercase tracking-[0.3em] text-mist/50">Rejected</p>
            <p class="text-2xl font-semibold text-mist">MYR 19,300</p>
            <p class="text-sm text-mist/60">Audit trail preserved</p>
          </div>
        </div>

        <div class="mt-6 rounded-2xl border border-dashed border-mist/30 px-4 py-5 text-sm text-mist/70">
          Chart placeholders will be replaced with Chart.js dashboards in Sprint 6.
        </div>
      </section>
    </main>
  </div>
</template>
