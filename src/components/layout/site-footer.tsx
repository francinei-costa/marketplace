import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function SiteFooter() {
  return (
    <footer id="rodape" className="mx-auto mt-20 max-w-[1440px] px-5 pb-8">
      <div className="grid gap-0 bg-panel p-6 sm:grid-cols-2 lg:grid-cols-4 lg:p-8">
        {[
          [
            "W",
            "Segurança da carteira",
            "Proteja sua carteira e colecione arte digital verificada com confiança.",
          ],
          [
            "C",
            "Criadores em destaque",
            "Conheça artistas, estúdios e comunidades que moldam a cultura digital.",
          ],
          [
            "D",
            "Alertas de lançamentos",
            "Receba calendários de cunhagem, novidades e listas de acesso.",
          ],
        ].map(([initial, title, body]) => (
          <section key={title} className="border-line py-3 lg:border-r lg:px-5">
            <span className="h-[74px] w-[74px] mb-3 grid size-12 place-items-center rounded-full bg-copper text-lg font-black text-ink font-bold text-[24px] text-center align-middle">
              {initial}
            </span>
            <h2 className="mb-2 font-bold">{title}</h2>
            <p className="text-sm leading-6 text-sand">{body}</p>
          </section>
        ))}
        <section className="py-3 lg:border-l lg:border-copper lg:pl-4 lg:pr-0">
          <h2 className="mb-3 text-base font-bold leading-[18px] text-white">
            Antecipe-se ao próximo lançamento
          </h2>
          <form className="flex" onSubmit={(event) => event.preventDefault()}>
            <Input
              className="h-10 rounded-r-none border-0 bg-[#38220F] px-3 text-sm placeholder:text-[#c9a875]"
              type="email"
              placeholder="Digite seu e-mail..."
              aria-label="E-mail para novidades"
            />
            <Button
              className="h-10 min-h-10 rounded-l-none bg-copper px-4 font-bold text-[18px] leading-[16px] t-ink hover:bg-amber disabled:opacity-100 cursor-pointer"
              disabled
              title="Cadastro de novidades indisponível nesta demonstração"
            >
              Enviar
            </Button>
          </form>
          <p className="mt-3 text-sm leading-[22px] text-sand">
            Receba lançamentos selecionados, histórias de criadores e novidades
            do mercado.
          </p>
        </section>
      </div>
      <div className="bg-[#38220F] text-[#F5F1EB]">
        <div className="grid items-center gap-4 px-8 py-6 text-sm md:grid-cols-4 md:px-8">
          <Link to="/" className="font-bold tracking-[0.16em]">
            KURIO
          </Link>
          <p className="max-w-55 leading-5">
            Feito para colecionadores, criadores e cultura
          </p>
          <a href="mailto:contato@email.com" className="hover:underline">
            contato@email.com
          </a>
          <a href="tel:+551140028922" className="hover:underline">
            +55 11 4002 8922
          </a>
        </div>
      </div>
      <div className="grid gap-6 bg-panel px-6 py-6 text-sm sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <FooterColumn
          title="Meu perfil"
          items={[
            "Meu perfil",
            "Minha coleção",
            "Atividade",
            "Estúdio do criador",
            "Lista de interesse",
          ]}
        />
        <FooterColumn
          title="Central de ajuda"
          items={[
            "Central de ajuda",
            "Como comprar NFTs",
            "Carteira e segurança",
            "Política do mercado",
            "Denunciar item",
          ]}
        />
        <FooterColumn
          title="Coleções"
          items={[
            "Arte digital",
            "Fotografia",
            "Música",
            "Arte 3D",
            "Utilidade",
          ]}
        />
        <section>
          <h2 className="mb-3 text-lg font-bold leading-5 text-white">
            Redes sociais
          </h2>
          <div className="flex gap-2" aria-label="Redes sociais">
            <span
              role="img"
              aria-label="Facebook"
              className="grid size-[32px] place-items-center rounded border border-copper text-amber"
            >
              <span className="text-lg font-bold">f</span>
            </span>
            <span
              role="img"
              aria-label="Instagram"
              className="grid size-[32px] place-items-center rounded border border-copper text-amber"
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle
                  cx="18"
                  cy="6"
                  r="1"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </span>
            <span
              role="img"
              aria-label="Twitter"
              className="grid size-[32px] place-items-center rounded border border-copper text-amber"
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M23.953 4.57a10 10 0 0 1-2.825.775 4.932 4.932 0 0 0 2.163-2.723 9.99 9.99 0 0 1-3.127 1.195 4.916 4.916 0 0 0-8.384 4.482A13.944 13.944 0 0 1 1.64 3.162a4.916 4.916 0 0 0 1.523 6.557 4.903 4.903 0 0 1-2.229-.616v.062a4.918 4.918 0 0 0 3.946 4.818 4.936 4.936 0 0 1-2.224.084 4.926 4.926 0 0 0 4.6 3.42A9.868 9.868 0 0 1 0 19.54a13.94 13.94 0 0 0 7.548 2.212c9.057 0 14.01-7.503 14.01-14.01 0-.213-.005-.425-.014-.636a10.012 10.012 0 0 0 2.46-2.548z" />
              </svg>
            </span>
            <span
              role="img"
              aria-label="LinkedIn"
              className="grid size-[32px] place-items-center rounded border border-copper text-base font-bold text-amber"
            >
              in
            </span>
            <span
              role="img"
              aria-label="YouTube"
              className="grid size-[32px] place-items-center rounded border border-copper text-amber"
            >
              <svg
                aria-hidden="true"
                width="19"
                height="16"
                viewBox="0 0 24 18"
                fill="currentColor"
              >
                <path d="M23.5 2.8a3 3 0 0 0-2.1-2.1C19.5.2 12 .2 12 .2s-7.5 0-9.4.5A3 3 0 0 0 .5 2.8 31 31 0 0 0 0 9s0 3.6.5 6.2a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 9s0-3.6-.5-6.2ZM9.6 12.7V5.3L15.8 9l-6.2 3.7Z" />
              </svg>
            </span>
          </div>
          <h2 className="mb-2 mt-6 text-lg font-bold leading-5 text-white">
            Carteiras compatíveis
          </h2>
          <div className="w-[25em] flex items-center justify-between gap-1 whitespace-nowrap rounded border border-line bg-panel-soft px-2 py-2 text-[8px] font-bold text-amber">
            <span>METAMASK</span>
            <span>·</span>
            <span>WALLETCONNECT</span>
            <span>·</span>
            <span>COINBASE</span>
          </div>
        </section>
      </div>
      <p className="pt-4 text-center text-xs text-white">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="mb-3 font-bold">{title}</h2>
      <ul className="space-y-2 text-white">{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  );
}
