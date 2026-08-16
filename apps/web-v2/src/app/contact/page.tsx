import StatsBand from '@/components/StatsBand';
import FaqSection from '@/components/FaqSection';
import { ITarget } from '@/components/icons';

// /contact — pixel-clone Findit · header + ข้อมูลติดต่อ/ฟอร์ม 2-col + StatsBand + FAQ
// ค่าติดต่อ = placeholder ทั่วไป (STAGE1) รอเจ้าของแทนของจริง

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-2 space-y-1 text-sm text-ink">{children}</div>
    </div>
  );
}

function Field({ label, placeholder, textarea }: { label: string; placeholder: string; textarea?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      {textarea ? (
        <textarea rows={4} placeholder={placeholder} className="w-full rounded-lg border border-line bg-soft px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
      ) : (
        <input type="text" placeholder={placeholder} className="h-11 w-full rounded-lg border border-line bg-soft px-3 text-sm text-ink outline-none focus:border-ink" />
      )}
    </label>
  );
}

export default function ContactPage() {
  return (
    <>
      <section className="wrap py-16 md:py-20">
        {/* header */}
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
          <span className="text-ink">{ITarget}</span>Contact Us
        </p>
        <h1 className="mt-4 text-[36px] font-medium leading-tight sm:text-[52px]">Let&rsquo;s Connect</h1>

        <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* LEFT — intro + contact info */}
          <div>
            <p className="max-w-[380px] text-base leading-relaxed text-body">
              Whether you&rsquo;re buying, selling, or just exploring options, our team is here to help. Reach out today and let&rsquo;s start the conversation.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8">
              <InfoBlock label="Email Address"><a href="mailto:hello@example.com" className="transition hover:text-body">hello@example.com</a></InfoBlock>
              <InfoBlock label="Phone"><p>(123) 456-7890</p><p>(987) 654-3210</p></InfoBlock>
              <InfoBlock label="Location"><p>123 Main Street, Suite 456,<br />Cityville, ST 78901</p></InfoBlock>
              <InfoBlock label="Working Hours"><p>Mon &ndash; Fri: 9:00 AM &ndash; 6:00 PM</p><p>Sat: 10:00 AM &ndash; 3:00 PM</p></InfoBlock>
              <InfoBlock label="Follow us">
                <div className="flex flex-col gap-1">
                  <a href="#" className="transition hover:text-body">Facebook</a>
                  <a href="#" className="transition hover:text-body">Instagram</a>
                  <a href="#" className="transition hover:text-body">Youtube</a>
                </div>
              </InfoBlock>
            </div>
          </div>

          {/* RIGHT — form */}
          <form className="space-y-4">
            <Field label="Name" placeholder="Your name*" />
            <Field label="Email" placeholder="Your email*" />
            <Field label="Phone" placeholder="Your phone*" />
            <Field label="Message" placeholder="Message" textarea />
            <button type="button" className="rounded-pill bg-ink px-8 py-3 text-[15px] font-semibold text-white transition hover:opacity-90">Submit</button>
          </form>
        </div>
      </section>

      <StatsBand variant="dark" />
      <FaqSection />
    </>
  );
}
