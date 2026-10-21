import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "About Us — Maxwellina Foods",
  description: "Meet the owner behind Maxwellina Foods and discover our love for simple, homemade goodness."
};

export default function AboutPage() {
  return (
    <>
      <div className="announcement">
        <span>GOOD FOOD, MADE SIMPLE</span>
        <span>Made with care in Ghana</span>
      </div>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Maxwellina Foods home">
          <Image src="/logo.svg" alt="Maxwellina Foods" width={105} height={49} priority />
        </Link>
        <nav className="main-nav about-nav" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/#products">Our mixes</Link>
        </nav>
        <Link className="header-order" href="/#products">
          Shop the mixes <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <main className="about-page">
        <section className="about-hero">
          <div className="about-copy">
            <p className="eyebrow">
              <span className="eyebrow-line" /> The person behind the goodness
            </p>
            <h1>
              Homemade goodness,<br />
              <em>made with care.</em>
            </h1>
            <p className="about-intro">
              Maxwellina Foods is built around a simple belief: good food should bring people
              together, without making the preparation complicated.
            </p>
            <p>
              Our bofrot and pancake mixes make it easier to share familiar favourites at home.
              Choose a mix, add a little care, and make room for the moments around the table.
            </p>
            <Link className="button button-dark" href="/#products">
              Explore our mixes <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <figure className="about-portrait">
            <Image
              src="/owner.jpg"
              alt="The owner of Maxwellina Foods"
              width={720}
              height={1280}
              priority
              sizes="(max-width: 700px) 86vw, 42vw"
            />
            <figcaption>Maxwellina Foods · Made with care in Ghana</figcaption>
          </figure>
        </section>

        <section className="about-values" aria-labelledby="about-values-title">
          <div>
            <p className="eyebrow"><span className="eyebrow-line" /> What matters to us</p>
            <h2 id="about-values-title">A little less fuss.<br /><em>A lot more together.</em></h2>
          </div>
          <p>
            From a quiet breakfast to a table full of family, we want Maxwellina mixes to make
            homemade moments feel more within reach. That is the care we put into every pack.
          </p>
        </section>

        <section className="about-signoff">
          <Image src="/logo.svg" alt="Maxwellina Foods" width={115} height={54} />
          <p>Thank you for making a place for us at your table.</p>
          <Link className="text-link" href="/">
            Back to the shop <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Maxwellina Foods. Made with care in Ghana.</span>
          <Link href="/">Shop</Link>
          <Link href="/admin">Owner sign in</Link>
        </div>
      </footer>
    </>
  );
}