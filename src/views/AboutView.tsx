"use client";
import { useState } from "react";
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Heart,
  Info,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import { BrandMark } from "@/components/atoms";
import { PageHeading, Panel } from "@/components/molecules";

export const PROJECT_LINKS = {
  app: "https://github.com/serkan-uslu/ema-lightning-ui",
  site: "https://github.com/serkan-uslu/ema-studio-site",
};

export const MODEL_LINKS = {
  card: "https://huggingface.co/canberkkkkkk/ema-lightning",
  author: "https://huggingface.co/canberkkkkkk",
  source: "https://github.com/canberk7/ema-lightning",
  pypi: "https://pypi.org/project/ema-lightning/",
  normalizer: "https://github.com/erdemtuna/normalizer-tr",
};

const CITATION = `@misc{aslan2026emalightning,
  title        = {EMA Lightning: Tiny, Fast and Accurate Turkish Text to Speech},
  author       = {Aslan, Canberk},
  year         = {2026},
  howpublished = {\\url{https://huggingface.co/canberkkkkkk/ema-lightning}}
}`;

function ExternalItem({
  href,
  label,
  detail,
}: {
  href: string;
  label: string;
  detail: string;
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="external-link"
      >
        <span>
          <strong>{label}</strong>
          <small>{detail}</small>
        </span>
        <ExternalLink size={15} aria-hidden="true" />
      </a>
    </li>
  );
}

export function AboutView() {
  const { t } = useI18n();
  const a = t.about;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CITATION);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return (
    <>
      <PageHeading eyebrow={a.eyebrow} title={a.title} lead={a.lead} />
      <section className="about-hero">
        <BrandMark size={30} />
        <div>
          <p className="eyebrow">{a.modelTitle}</p>
          <p className="about-hero-text">{a.model}</p>
          <a
            className="btn btn-primary"
            href={MODEL_LINKS.card}
            target="_blank"
            rel="noreferrer noopener"
          >
            <Sparkles size={16} />
            {a.modelCard}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </section>
      <div className="about-grid">
        <Panel icon={Info} title={a.whatTitle} className="settings-panel">
          <p className="prose">{a.what}</p>
        </Panel>
        <Panel
          icon={Heart}
          title={a.thanksTitle}
          className="settings-panel about-thanks"
        >
          <p className="prose">{a.thanks}</p>
        </Panel>
        <Panel icon={ExternalLink} title={a.links} className="settings-panel">
          <ul className="link-list">
            <ExternalItem
              href={PROJECT_LINKS.app}
              label={a.appSource}
              detail="serkan-uslu/ema-lightning-ui"
            />
            <ExternalItem
              href={PROJECT_LINKS.site}
              label={a.siteSource}
              detail="serkan-uslu/ema-studio-site"
            />
            <ExternalItem
              href={MODEL_LINKS.card}
              label={a.modelCard}
              detail="canberkkkkkk/ema-lightning"
            />
            <ExternalItem
              href={MODEL_LINKS.author}
              label={a.author}
              detail="Canberk Aslan · @canberkkkkkk"
            />
            <ExternalItem
              href={MODEL_LINKS.source}
              label={a.sourceCode}
              detail="canberk7/ema-lightning"
            />
            <ExternalItem
              href={MODEL_LINKS.pypi}
              label={a.pypi}
              detail="ema-lightning"
            />
            <ExternalItem
              href={MODEL_LINKS.normalizer}
              label={a.normalizer}
              detail="Erdem Tuna"
            />
          </ul>
        </Panel>
        <Panel
          icon={BookOpen}
          title={a.citeTitle}
          aside={
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={copy}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? a.copied : a.copy}
            </button>
          }
          className="settings-panel"
        >
          <p className="prose">{a.citeText}</p>
          <pre className="citation">{CITATION}</pre>
        </Panel>
        <Panel
          icon={Wrench}
          title={a.stackTitle}
          className="settings-panel about-wide"
        >
          <p className="prose">{a.stack}</p>
          <p className="footnote">{a.disclaimer}</p>
        </Panel>
      </div>
    </>
  );
}
