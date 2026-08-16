import { ITarget } from '@/components/icons';

// /add-property — pixel-clone Findit "List your property" · ฟอร์มยาว centered (static · STAGE1)
const inputCls = 'h-11 w-full rounded-lg border border-line bg-soft px-3 text-sm text-ink outline-none focus:border-ink';
const LOCATIONS = ['Brooklyn', 'Manhattan', 'Queens', 'Staten Island', 'The Bronx'];
const CATEGORIES = ['Apartments', 'Condos', 'Houses', 'Villas'];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-12 first:mt-0">
      <legend className="mb-5 text-2xl font-medium text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, placeholder, suffix, textarea }: { label: string; placeholder?: string; suffix?: string; textarea?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      {textarea ? (
        <textarea rows={4} placeholder={placeholder} className="w-full rounded-lg border border-line bg-soft px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
      ) : (
        <div className="relative">
          <input type="text" placeholder={placeholder} className={inputCls} />
          {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{suffix}</span>}
        </div>
      )}
    </label>
  );
}

function Select({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      <select className={`${inputCls} appearance-none`} defaultValue="">
        <option value="" disabled>Select...</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

function RadioRow({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <div>
      <span className="mb-3 block text-xs text-muted">{label}</span>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {options.map((o) => (
          <label key={o} className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input type="radio" name={name} className="h-4 w-4 accent-ink" />{o}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function AddPropertyPage() {
  return (
    <>
      <section className="wrap py-16 md:py-20">
        {/* header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            <span className="text-ink">{ITarget}</span>Submit Property
          </p>
          <h1 className="mt-4 text-[30px] font-medium leading-tight sm:text-[42px]">List your property with us</h1>
          <p className="mx-auto mt-4 max-w-[480px] text-base leading-relaxed text-body">
            Reach thousands of potential buyers by listing your property on our platform. Our team will guide you through the process to ensure a smooth and successful sale.
          </p>
        </div>

        {/* form */}
        <form className="mx-auto mt-12 max-w-[660px]">
          <Group title="Personal information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" placeholder="Your name*" />
              <Field label="Email" placeholder="Your email*" />
              <Field label="Phone" placeholder="Your phone*" />
            </div>
          </Group>

          <Group title="Property description">
            <div className="space-y-4">
              <Field label="Property Name" placeholder="Your property name*" />
              <Field label="Description" placeholder="Your property description ..." textarea />
              <RadioRow label="Location" name="location" options={LOCATIONS} />
              <RadioRow label="Property Category" name="category" options={CATEGORIES} />
              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                <Select label="Property For" options={['Sell', 'Rent']} />
                <Field label="Price" placeholder="0" />
                <Select label="Currency" options={['For Sell', 'For Rent']} />
              </div>
            </div>
          </Group>

          <Group title="Property features">
            <Field label="Features" placeholder="Your property features ..." textarea />
          </Group>

          <Group title="Property details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Size" placeholder="0" suffix="m²" />
              <Field label="Bedrooms" placeholder="0" />
              <Field label="Bathrooms" placeholder="0" />
              <Field label="Floor" placeholder="2nd" />
              <Field label="Additional Space" placeholder="Basement" />
              <Field label="Furnishing" placeholder="Semi furnished" />
              <Field label="Ceiling Height" placeholder="0" suffix="m" />
              <Field label="Construction Year" placeholder="mm/dd/yyyy" />
              <Field label="Renovation" placeholder="mm/dd/yyyy" />
            </div>
          </Group>

          <Group title="Property utility">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Heating" placeholder="Natural Gas" />
              <Select label="Air Condition" options={['Yes', 'No']} />
              <Select label="Fireplace" options={['Yes', 'No']} />
              <Select label="Elevator" options={['Yes', 'No']} />
              <Select label="Ventilation" options={['Yes', 'No']} />
              <Select label="Intercom" options={['Yes', 'No']} />
              <Field label="Window Type" placeholder="Aluminum frame" />
              <Select label="Cable TV" options={['Yes', 'No']} />
              <Select label="Wifi" options={['Yes', 'No']} />
            </div>
          </Group>

          <Group title="Message">
            <Field label="" placeholder="Message" textarea />
          </Group>

          <button type="button" className="mt-8 w-full rounded-pill bg-ink py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90">Submit</button>
        </form>
      </section>
    </>
  );
}
