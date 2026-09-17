export const metadata = {
  title: "Privacy Policy — Cogent Analytics ROI Calculator",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: September 15, 2026</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">About This Application</h2>
        <p className="text-gray-600 mb-3">
          The Cogent Analytics ROI Calculator is an internal sales tool used by
          Cogent Analytics to generate advertising return-on-investment
          projections for prospective clients. It helps account managers estimate
          Google Ads performance across approximately 90 industries using
          real-time keyword cost data from the Google Ads API.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Data We Access</h2>
        <p className="text-gray-600 mb-3">
          This application connects to the Google Ads API solely to retrieve
          aggregate, anonymized keyword performance data, including:
        </p>
        <ul className="list-disc pl-6 text-gray-600 mb-3 space-y-1">
          <li>Average cost-per-click (CPC) estimates for industry keywords</li>
          <li>Approximate monthly search volume ranges</li>
          <li>Keyword competition levels (low, medium, high)</li>
        </ul>
        <p className="text-gray-600">
          This data is publicly available through the Google Ads Keyword Planner
          and does not include any personally identifiable information, user
          browsing data, or individual advertiser account data.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Data We Do Not Collect</h2>
        <p className="text-gray-600 mb-3">
          This application does not collect, store, or share:
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Personal information from end users</li>
          <li>Browsing history or cookies for tracking purposes</li>
          <li>Individual Google Ads account data or campaign performance</li>
          <li>Email addresses, names, or contact information of visitors</li>
          <li>Payment or financial information</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">How Data Is Used</h2>
        <p className="text-gray-600">
          The keyword performance data retrieved from Google Ads is used
          exclusively to calculate estimated ROI projections within the
          application. Data is fetched on demand, used for the calculation, and
          is not stored persistently. No data is sold, shared with third
          parties, or used for advertising purposes.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Google API Services</h2>
        <p className="text-gray-600">
          This application&apos;s use of information received from Google APIs
          adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="text-blue-600 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Contact</h2>
        <p className="text-gray-600">
          For questions about this privacy policy or the application, contact{" "}
          <a
            href="mailto:cogentexternalads@gmail.com"
            className="text-blue-600 underline"
          >
            cogentexternalads@gmail.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
