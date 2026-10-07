import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  CreditCard,
  Landmark,
  LockKeyhole,
  Menu,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import "./retail.css";

const PUBLIC_BANK_URL = "https://mfecbank.demohub24.com";
const INTERNET_BANK_URL = "https://ibank.demohub24.com";
const BACKEND_URL = "https://backend.demohub24.com";
const internetBankUrl = (path: string) => `${INTERNET_BANK_URL}${path}`;

type Product = {
  category: string;
  code: string;
  name: string;
  tagline: string;
  rate: string;
  features: string[];
};
type AnyRecord = Record<string, any>;
type ProductDetailInfo = {
  summary: string;
  idealFor: string;
  highlights: string[];
  eligibility: string[];
  pricing: string[];
  documents: string[];
  important: string[];
};
const productDetails: Record<string, ProductDetailInfo> = {
  SAVINGS_PLUS: {
    summary:
      "A flexible everyday savings account for receiving money, paying bills and building an emergency fund while retaining immediate access to cash.",
    idealFor:
      "Customers who want one primary transactional savings account with digital access and no complicated balance rules.",
    highlights: [
      "Interest calculated daily and credited twice yearly",
      "Internet Banking transfers and real-time transaction history",
      "Eligible for synthetic deposit-protection simulation",
      "No fixed term or withdrawal notice",
    ],
    eligibility: [
      "Individual aged 15 or older",
      "Verified identity and active customer profile",
      "Thai residential contact details in this demonstration",
    ],
    pricing: [
      "Opening deposit: THB 500",
      "Interest: up to 1.50% p.a. in the demonstration",
      "No monthly account-maintenance fee",
      "Transaction charges may apply outside MFEC Bank",
    ],
    documents: [
      "Synthetic national identity number",
      "Registered mobile number and email",
      "Address and tax-residency declaration",
    ],
    important: [
      "Rates may change after notice",
      "Interest is subject to simulated tax rules",
      "This product does not hold real funds",
    ],
  },
  FIXED_12M: {
    summary:
      "A 12-month fixed deposit designed for customers who can set money aside in exchange for a predictable simulated return.",
    idealFor:
      "Customers saving toward a planned goal who do not need regular access to the deposited amount.",
    highlights: [
      "Fixed 12-month placement",
      "Choose monthly or maturity interest in the demonstration",
      "Automatic maturity instruction",
      "Deposit-protection simulation",
    ],
    eligibility: [
      "Individual aged 18 or older",
      "Active MFEC Bank customer profile",
      "Funding from an eligible MFEC Bank deposit account",
    ],
    pricing: [
      "Minimum placement: THB 10,000",
      "Illustrative rate: 2.25% p.a.",
      "No account-maintenance fee",
      "Early withdrawal receives reduced or no interest",
    ],
    documents: [
      "Synthetic national identity number",
      "Source-of-funds declaration",
      "Maturity instruction",
    ],
    important: [
      "Principal is locked for the selected term",
      "Early-withdrawal conditions apply",
      "Rate shown is synthetic and not guaranteed for future applications",
    ],
  },
  PLATINUM_VISA: {
    summary:
      "A premium synthetic credit card combining accelerated rewards, travel privileges and configurable card-security controls.",
    idealFor:
      "Customers with frequent card spending who value rewards and travel-oriented benefits.",
    highlights: [
      "Two demonstration reward points per eligible THB 25",
      "Travel and airport-benefit simulation",
      "Real-time card activity and fraud monitoring",
      "Online block, unblock and replacement controls",
    ],
    eligibility: [
      "Individual aged 20-65",
      "Minimum illustrative income: THB 50,000 per month",
      "Verified KYC and satisfactory synthetic credit review",
    ],
    pricing: [
      "Illustrative credit limit: determined after review",
      "Annual fee waived in this demonstration",
      "Illustrative purchase rate: 16% p.a.",
      "Cash-advance and late-payment fees may apply",
    ],
    documents: [
      "Synthetic identity document",
      "Income evidence for the latest three months",
      "Bank statements or payroll evidence",
    ],
    important: [
      "Approval and credit limit depend on admin review",
      "Minimum payments increase interest cost",
      "No real payment-network card is issued",
    ],
  },
  CASHBACK: {
    summary:
      "A straightforward synthetic credit card that returns part of eligible dining, grocery and online spending as demonstration cashback.",
    idealFor:
      "Everyday spenders who prefer simple monthly cashback over points or travel benefits.",
    highlights: [
      "Up to 3% demonstration cashback in selected categories",
      "Monthly cashback summary",
      "Instant transaction visibility",
      "Fraud alerts and self-service card controls",
    ],
    eligibility: [
      "Individual aged 20-65",
      "Minimum illustrative income: THB 20,000 per month",
      "Verified KYC and successful synthetic credit review",
    ],
    pricing: [
      "Annual fee waived when illustrative spend criteria are met",
      "Illustrative purchase rate: 16% p.a.",
      "Cashback caps and excluded transactions apply",
      "Late-payment fee may apply",
    ],
    documents: [
      "Synthetic identity document",
      "Recent income evidence",
      "Current contact and employment information",
    ],
    important: [
      "Cashback categories and caps may change",
      "Approval does not guarantee the requested limit",
      "Card identifiers are synthetic and unusable for payment",
    ],
  },
  TRAVEL: {
    summary:
      "A travel-focused synthetic card for foreign-currency scenarios, trip planning and emergency card-service demonstrations.",
    idealFor:
      "Customers who travel regularly and want transparent simulated overseas spending controls.",
    highlights: [
      "Zero FX-markup simulation on eligible transactions",
      "Travel-notice management",
      "Emergency replacement workflow",
      "Airport and travel-insurance benefit simulation",
    ],
    eligibility: [
      "Individual aged 20-65",
      "Minimum illustrative income: THB 35,000 per month",
      "Verified identity and synthetic credit approval",
    ],
    pricing: [
      "Illustrative annual fee: THB 2,000, waived by spend criteria",
      "Network exchange rate simulation applies",
      "Illustrative purchase rate: 16% p.a.",
      "ATM operator charges may apply",
    ],
    documents: [
      "Synthetic identity document",
      "Income and employment evidence",
      "Contact details and travel-purpose declaration",
    ],
    important: [
      "Travel benefits are demonstrations only",
      "Exchange-rate movements can affect transaction value",
      "No real international card is created",
    ],
  },
  PERSONAL: {
    summary:
      "An unsecured installment loan with a fixed synthetic repayment schedule for personal expenses or planned purchases.",
    idealFor:
      "Salaried customers who need a defined borrowing amount and predictable monthly installments.",
    highlights: [
      "Illustrative terms from 12 to 60 months",
      "Fixed monthly repayment schedule",
      "No collateral required",
      "Early-settlement simulation available",
    ],
    eligibility: [
      "Individual aged 20-60 at application",
      "Minimum illustrative income: THB 20,000 per month",
      "At least six months of current employment",
      "Acceptable synthetic affordability assessment",
    ],
    pricing: [
      "Illustrative rate from 8.50% p.a.",
      "Loan amount determined after review",
      "No application fee in the demonstration",
      "Late-payment charges may apply",
    ],
    documents: [
      "Synthetic identity document",
      "Three months of payslips and statements",
      "Employment and existing-debt declaration",
    ],
    important: [
      "Total repayment depends on approved amount and term",
      "Missed payments affect the synthetic credit record",
      "Approval remains subject to administrator review",
    ],
  },
  HOME: {
    summary:
      "A long-term synthetic mortgage for home purchase, construction or refinancing scenarios with flexible repayment options.",
    idealFor:
      "Customers planning a residential property purchase who require long-term structured financing.",
    highlights: [
      "Illustrative term of up to 30 years",
      "Introductory fixed-rate simulation",
      "Flexible repayment and refinance scenarios",
      "Digital repayment tracking",
    ],
    eligibility: [
      "Individual aged 20 or older and not over 70 at maturity",
      "Stable documented synthetic income",
      "Property and affordability assessment",
      "Acceptable synthetic credit history",
    ],
    pricing: [
      "Introductory illustrative rate from 3.25% p.a.",
      "Approved loan-to-value depends on review",
      "Valuation, mortgage and insurance costs may apply",
      "Rates may become variable after the introductory period",
    ],
    documents: [
      "Synthetic identity and household documents",
      "Six months of income and bank statements",
      "Property sale, title and valuation documents",
      "Existing liability declaration",
    ],
    important: [
      "Property would secure a real mortgage, but this environment is synthetic",
      "Variable rates can change installments",
      "Affordability and property review are required before approval",
    ],
  },
  BALANCED_FUND: {
    summary:
      "A diversified synthetic mutual fund combining equity and fixed-income exposure to balance long-term growth and portfolio stability.",
    idealFor:
      "Medium- to long-term investors comfortable with moderate market fluctuations and a diversified allocation.",
    highlights: [
      "Diversified equity and bond allocation",
      "Daily NAV simulation",
      "Professional portfolio-management scenario",
      "Online portfolio valuation",
    ],
    eligibility: [
      "Individual aged 20 or older",
      "Completed KYC and investment suitability assessment",
      "Risk profile compatible with level 5",
      "Investment account approval",
    ],
    pricing: [
      "Illustrative initial investment: THB 1,000",
      "Front-end fee: up to 1.0% in the simulation",
      "Management expenses reflected in NAV",
      "No guaranteed return",
    ],
    documents: [
      "Synthetic identity document",
      "Suitability and risk questionnaire",
      "Tax status and source-of-funds declaration",
    ],
    important: [
      "Investment value can rise or fall",
      "Past simulated performance does not predict future results",
      "Investors may receive less than the amount invested",
    ],
  },
  THAI_EQUITY: {
    summary:
      "A higher-risk synthetic mutual fund focused on Thai listed-equity scenarios and long-term capital-growth potential.",
    idealFor:
      "Long-term investors who accept significant market volatility in pursuit of equity growth.",
    highlights: [
      "Synthetic exposure to diversified Thai equities",
      "Daily NAV and performance simulation",
      "Long-term growth strategy",
      "Portfolio reporting through Internet Banking",
    ],
    eligibility: [
      "Individual aged 20 or older",
      "Completed KYC and suitability assessment",
      "Risk profile compatible with level 6",
      "Ability to tolerate capital loss",
    ],
    pricing: [
      "Illustrative initial investment: THB 1,000",
      "Front-end fee: up to 1.5% in the simulation",
      "Management expenses reflected in NAV",
      "Redemption settlement timing applies",
    ],
    documents: [
      "Synthetic identity document",
      "Investment suitability questionnaire",
      "Tax residence and source-of-funds declaration",
    ],
    important: [
      "High market volatility and capital loss are possible",
      "Concentration in one market increases risk",
      "No return or principal is guaranteed",
    ],
  },
};
const categories = [
  [
    "deposit",
    "Deposit Accounts",
    Landmark,
    "Save, transact and plan with confidence.",
  ],
  [
    "cards",
    "Credit Cards",
    CreditCard,
    "Rewards and privileges designed for every lifestyle.",
  ],
  [
    "loans",
    "Loans",
    Building2,
    "Flexible financing for your next important step.",
  ],
  [
    "investments",
    "Investments",
    TrendingUp,
    "Build a diversified synthetic investment portfolio.",
  ],
] as const;
const money = (v: any) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(
    Number(v || 0),
  );

function downloadStatement(customer: AnyRecord, account: AnyRecord) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const transactions = [...(account.transactions || [])].sort(
    (a: AnyRecord, b: AnyRecord) =>
      +new Date(a.occurredAt) - +new Date(b.occurredAt),
  );
  let runningBalance =
    Number(account.balance) -
    transactions.reduce(
      (sum: number, transaction: AnyRecord) => sum + Number(transaction.amount),
      0,
    );
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  let y = 0;
  const header = () => {
    pdf.setFillColor(9, 54, 95);
    pdf.rect(0, 0, width, 34, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("MFEC BANK", 16, 16);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("Internet Banking Account Statement", 16, 24);
    pdf.setTextColor(20, 43, 71);
    y = 45;
  };
  const tableHeader = () => {
    pdf.setFillColor(229, 239, 246);
    pdf.rect(14, y - 5, 182, 8, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("DATE", 16, y);
    pdf.text("DESCRIPTION", 42, y);
    pdf.text("DEBIT", 138, y, { align: "right" });
    pdf.text("CREDIT", 163, y, { align: "right" });
    pdf.text("BALANCE", 194, y, { align: "right" });
    pdf.setFont("helvetica", "normal");
    y += 7;
  };
  const footer = () => {
    pdf.setFontSize(7);
    pdf.setTextColor(105, 122, 140);
    pdf.text(
      "Synthetic demonstration statement - not valid as proof of funds.",
      14,
      height - 10,
    );
    pdf.text(`Page ${pdf.getNumberOfPages()}`, width - 14, height - 10, {
      align: "right",
    });
  };
  header();
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text(customer.englishName, 16, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Customer ID: ${customer.id}   CIF: ${customer.cif}`, 16, y + 6);
  pdf.text(
    `Account: ${account.maskedNumber}   Type: ${String(account.type).replaceAll("_", " ")}   Currency: THB`,
    16,
    y + 12,
  );
  pdf.text(
    `Statement generated: ${new Date().toLocaleString("en-GB")}`,
    16,
    y + 18,
  );
  y += 31;
  tableHeader();
  if (!transactions.length) {
    pdf.setFontSize(9);
    pdf.text("No transactions are available for this account.", 16, y + 4);
  }
  for (const transaction of transactions) {
    if (y > height - 25) {
      footer();
      pdf.addPage();
      header();
      tableHeader();
    }
    const amount = Number(transaction.amount);
    runningBalance += amount;
    pdf.setFontSize(7.5);
    pdf.setTextColor(20, 43, 71);
    pdf.text(
      new Date(transaction.occurredAt).toLocaleDateString("en-GB"),
      16,
      y,
    );
    pdf.text(
      pdf.splitTextToSize(String(transaction.description), 85)[0],
      42,
      y,
    );
    pdf.text(amount < 0 ? Math.abs(amount).toFixed(2) : "-", 138, y, {
      align: "right",
    });
    pdf.text(amount >= 0 ? amount.toFixed(2) : "-", 163, y, {
      align: "right",
    });
    pdf.text(runningBalance.toFixed(2), 194, y, { align: "right" });
    pdf.setDrawColor(225, 232, 238);
    pdf.line(14, y + 3, 196, y + 3);
    y += 7;
  }
  y += 6;
  pdf.setFillColor(242, 247, 250);
  pdf.rect(120, y - 6, 76, 18, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Closing balance", 125, y);
  pdf.text(`${Number(account.balance).toFixed(2)} THB`, 192, y, {
    align: "right",
  });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text(
    `Available: ${Number(account.availableBalance).toFixed(2)} THB`,
    192,
    y + 7,
    {
      align: "right",
    },
  );
  footer();
  pdf.save(`MFEC-Bank-Statement-${account.id}.pdf`);
}

export default function RetailBank() {
  const [products, setProducts] = useState<Product[]>([]);
  const [session, setSession] = useState<AnyRecord | null>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    fetch("/retail/products")
      .then((r) => r.json())
      .then(setProducts);
    fetch("/retail/auth/session", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setSession);
  }, []);
  const path = location.pathname;
  const productPath = path.split("/").filter(Boolean);
  return (
    <div className="retail">
      <header className="retailhead">
        <a href={PUBLIC_BANK_URL} className="retaillogo">
          <img
            className="retail-logo-transparent"
            src="/mfec-logo-transparent.png"
            alt="MFEC"
          />
        </a>
        <button className="retailmenu" onClick={() => setMenu(!menu)}>
          {menu ? <X /> : <Menu />}
        </button>
        <nav className={menu ? "open" : ""}>
          <a href={PUBLIC_BANK_URL}>Home</a>
          <a href={`${PUBLIC_BANK_URL}/products/deposit`}>Deposits</a>
          <a href={`${PUBLIC_BANK_URL}/products/cards`}>Credit Cards</a>
          <a href={`${PUBLIC_BANK_URL}/products/loans`}>Loans</a>
          <a href={`${PUBLIC_BANK_URL}/products/investments`}>Investments</a>
        </nav>
        <a className="iblogin" href={internetBankUrl(session ? "/banking" : "/login")}>
          <LockKeyhole />
          {session ? "My Banking" : "Internet Banking"}
        </a>
      </header>
      {path === "/register" ? (
        <Register />
      ) : path === "/login" ? (
        <Login onLogin={setSession} />
      ) : path === "/banking" ? (
        <InternetBanking session={session} />
      ) : productPath[0] === "products" && productPath.length === 3 ? (
        <ProductDetail
          category={productPath[1]}
          code={productPath[2]}
          products={products}
          session={session}
        />
      ) : path.startsWith("/products/") ? (
        <ProductPage
          category={productPath[1] || ""}
          products={products}
          session={session}
        />
      ) : (
        <Landing products={products} session={session} />
      )}
      <Footer />
    </div>
  );
}

function Landing({ products, session }: { products: Product[]; session: any }) {
  return (
    <>
      <section className="retailhero">
        <div>
          <span className="retailkicker">WELCOME TO MFEC BANK</span>
          <h1>
            Banking that moves
            <br />
            forward with you.
          </h1>
          <p>
            Explore everyday banking, cards, loans and investments in the secure
            DemoHub24 synthetic banking environment.
          </p>
          <div className="heroactions">
            <a href={internetBankUrl(session ? "/banking" : "/login")}>
              Open Internet Banking <ArrowRight />
            </a>
            <a className="secondary" href="/products/deposit">
              Explore products
            </a>
          </div>
          <div className="trust">
            <ShieldCheck />
            <span>
              <b>Secure synthetic banking</b>
              <small>No real customer data or funds</small>
            </span>
          </div>
        </div>
        <div className="herocard">
          <span>MFEC BANK</span>
          <b>PLATINUM</b>
          <div className="chip" />
          <p>4599&nbsp;&nbsp;TEST&nbsp;&nbsp;XXXX&nbsp;&nbsp;2026</p>
          <small>DEMO CARD · NOT VALID FOR PAYMENT</small>
        </div>
      </section>
      <section className="quick">
        <div>
          <Smartphone />
          <b>Internet Banking</b>
          <span>Transfer and manage accounts</span>
          <a href={internetBankUrl(session ? "/banking" : "/login")}>
            Sign in <ChevronRight />
          </a>
        </div>
        <div>
          <CreditCard />
          <b>Find the right card</b>
          <span>Compare rewards and benefits</span>
          <a href="/products/cards">
            Compare cards <ChevronRight />
          </a>
        </div>
        <div>
          <Building2 />
          <b>Plan your next move</b>
          <span>Explore flexible loan options</span>
          <a href="/products/loans">
            View loans <ChevronRight />
          </a>
        </div>
        <div>
          <TrendingUp />
          <b>Grow your portfolio</b>
          <span>Discover investment products</span>
          <a href="/products/investments">
            Start exploring <ChevronRight />
          </a>
        </div>
      </section>
      <section className="retailsection">
        <span className="retailkicker">OUR PRODUCTS</span>
        <h2>Everything you need for your financial journey</h2>
        <p className="sectioncopy">
          Choose a product family to see features, rates and eligibility
          details.
        </p>
        <div className="categorygrid">
          {categories.map(([key, name, Icon, copy]) => (
            <a href={`/products/${key}`} key={key}>
              <Icon />
              <h3>{name}</h3>
              <p>{copy}</p>
              <span>
                Explore{" "}
                {products.filter((p) => mapCategory(key) === p.category).length}{" "}
                products <ArrowRight />
              </span>
            </a>
          ))}
        </div>
      </section>
      <section className="retailcta">
        <div>
          <span className="retailkicker">INTERNET BANKING</span>
          <h2>Your accounts, cards and transfers in one place.</h2>
          <p>Sign in with credentials managed securely by MFEC Core Banking.</p>
        </div>
        <a href={internetBankUrl(session ? "/banking" : "/login")}>
          {session ? "Go to My Banking" : "Sign in securely"} <ArrowRight />
        </a>
      </section>
    </>
  );
}
function mapCategory(category: string) {
  return category === "cards"
    ? "CARD"
    : category === "loans"
      ? "LOAN"
      : category === "investments"
        ? "INVESTMENT"
        : "DEPOSIT";
}

function ProductPage({
  category,
  products,
  session,
}: {
  category: string;
  products: Product[];
  session: any;
}) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const mapped = mapCategory(category),
    items = products.filter((p) => p.category === mapped);
  const names: AnyRecord = {
    DEPOSIT: [
      "Deposit Accounts",
      "Simple accounts for saving, spending and planning.",
    ],
    CARD: [
      "Credit Cards",
      "Choose rewards and benefits that match your lifestyle.",
    ],
    LOAN: ["Loans", "Flexible financing with clear synthetic repayment terms."],
    INVESTMENT: [
      "Investments",
      "Explore diversified products for your financial goals.",
    ],
  };
  const [title, copy] = names[mapped] || [
    "Banking Products",
    "Explore MFEC Bank products.",
  ];
  return (
    <main>
      <section className="producthero">
        <span className="retailkicker">MFEC BANK PRODUCTS</span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </section>
      <section className="productlist">
        {items.map((p, i) => (
          <article className="productcard" key={p.code}>
            <div className={`productvisual v${i % 4}`}>
              <span>{p.category}</span>
              <b>{p.name}</b>
              {p.category === "CARD" && <div className="minichip" />}
            </div>
            <div className="productcontent">
              <span className="producttype">{p.category}</span>
              <h2>{p.name}</h2>
              <p>{p.tagline}</p>
              <strong>{p.rate}</strong>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="productactions">
                <a href={`/products/${category}/${p.code.toLowerCase()}`}>
                  See more details <ChevronRight />
                </a>
                <button onClick={() => setSelectedProduct(p)}>
                  Apply now <ArrowRight />
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
      <p className="productnotice">
        All products, rates, applications and approvals are synthetic
        demonstrations. They are not offers of real financial services.
      </p>
      {selectedProduct && (
        <ProductApplicationForm
          product={selectedProduct}
          session={session}
          close={() => setSelectedProduct(null)}
        />
      )}
    </main>
  );
}

function ProductDetail({
  category,
  code,
  products,
  session,
}: {
  category: string;
  code: string;
  products: Product[];
  session: AnyRecord | null;
}) {
  const product = products.find(
    (item) => item.code.toLowerCase() === code.toLowerCase(),
  );
  const detail = product ? productDetails[product.code] : null;
  const [applying, setApplying] = useState(false);
  if (!product || !detail)
    return (
      <main className="productdetailmain">
        <div className="bankloading">Loading product details…</div>
      </main>
    );
  return (
    <main className="productdetailmain">
      <section
        className={`productdetailhero ${product.category.toLowerCase()}`}
      >
        <div>
          <a className="productback" href={`/products/${category}`}>
            ‹ Back to {product.category.toLowerCase()} products
          </a>
          <span className="retailkicker">{product.category} PRODUCT</span>
          <h1>{product.name}</h1>
          <p>{product.tagline}</p>
          <strong>{product.rate}</strong>
          <div className="productdetailactions">
            <button onClick={() => setApplying(true)}>
              Apply for this product <ArrowRight />
            </button>
            {session ? (
              <a href={internetBankUrl("/banking")}>View my portfolio</a>
            ) : (
              <a href={internetBankUrl(`/login?return=${encodeURIComponent(`${PUBLIC_BANK_URL}/products/${category}/${code}`)}`)}>
                Sign in to apply
              </a>
            )}
          </div>
        </div>
        <div className="detailvisual">
          <span>MFEC</span>
          <b>{product.name}</b>
          <small>
            {product.category === "CARD"
              ? "SYNTHETIC CARD · NOT VALID FOR PAYMENT"
              : "DEMO BANKING PRODUCT"}
          </small>
        </div>
      </section>
      <section className="detailintro">
        <div>
          <span className="retailkicker">PRODUCT OVERVIEW</span>
          <h2>Designed around your financial goals.</h2>
        </div>
        <div>
          <p>{detail.summary}</p>
          <strong>Ideal for</strong>
          <p>{detail.idealFor}</p>
        </div>
      </section>
      <section className="detailsections">
        <DetailBlock
          title="Key benefits"
          icon={<Check />}
          items={detail.highlights}
        />
        <DetailBlock
          title="Eligibility"
          icon={<ShieldCheck />}
          items={detail.eligibility}
        />
        <DetailBlock
          title={
            product.category === "INVESTMENT"
              ? "Investment and fees"
              : "Rates and fees"
          }
          icon={<TrendingUp />}
          items={detail.pricing}
        />
        <DetailBlock
          title="Documents required"
          icon={<WalletCards />}
          items={detail.documents}
        />
      </section>
      <section className="importantterms">
        <div>
          <span className="retailkicker">PLEASE CONSIDER</span>
          <h2>Important information</h2>
        </div>
        <ul>
          {detail.important.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="detailapplycta">
        <div>
          <span className="retailkicker">READY TO APPLY?</span>
          <h2>Submit your application for review.</h2>
          <p>
            Apply as a guest or sign in to use your existing MFEC Bank profile.
            No product is opened until administrator approval.
          </p>
        </div>
        <button onClick={() => setApplying(true)}>
          Apply for {product.name} <ArrowRight />
        </button>
      </section>
      <p className="productnotice">
        All product descriptions, rates, limits, eligibility rules and approval
        decisions are synthetic demonstrations and are not financial offers or
        advice.
      </p>
      {applying && (
        <ProductApplicationForm
          product={product}
          session={session}
          close={() => setApplying(false)}
        />
      )}
    </main>
  );
}

function DetailBlock({
  title,
  icon,
  items,
}: {
  title: string;
  icon: any;
  items: string[];
}) {
  return (
    <article className="detailblock">
      <div className="detailblockicon">{icon}</div>
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <Check />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

function ProductApplicationForm({
  product,
  session,
  close,
}: {
  product: Product;
  session: AnyRecord | null;
  close: () => void;
}) {
  const [form, setForm] = useState<AnyRecord>({
    englishName: "",
    thaiName: "",
    syntheticId: "",
    dateOfBirth: "",
    mobile: "",
    email: "",
    marketingConsent: false,
  });
  const [result, setResult] = useState<AnyRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/retail/product-applications", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productCode: product.code, ...form }),
    });
    const body = await response.json().catch(() => ({}));
    response.ok
      ? setResult(body)
      : setError(body.message || "Unable to submit application");
    setBusy(false);
  };
  return (
    <div className="applicationoverlay" role="dialog" aria-modal="true">
      <section className="applicationmodal">
        <button
          className="applicationclose"
          onClick={close}
          aria-label="Close application form"
        >
          <X />
        </button>
        {result ? (
          <div className="applicationsuccess">
            <ShieldCheck />
            <span className="retailkicker">APPLICATION RECEIVED</span>
            <h2>Thank you for applying.</h2>
            <p>
              {product.name} is waiting for administrator review. The product
              will be added to your portfolio only after approval.
            </p>
            <div>
              <small>Application reference</small>
              <strong>{result.reference}</strong>
            </div>
            <p>
              Customer status:{" "}
              <b>
                {result.customerCreated
                  ? "New customer record created"
                  : "Existing customer verified"}
              </b>
            </p>
            <button onClick={close}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <span className="retailkicker">APPLY FOR {product.category}</span>
            <h2>{product.name}</h2>
            {session ? (
              <div className="signedinapplicant">
                <ShieldCheck />
                <span>
                  <b>Applying as {session.customer?.englishName}</b>
                  <small>
                    Your authenticated Core Banking customer profile will be
                    used.
                  </small>
                </span>
              </div>
            ) : (
              <>
                <p>
                  Enter your information. MFEC Bank will securely match it to an
                  existing customer or create a new customer profile before
                  sending the request for approval.
                </p>
                <div className="registertwocol">
                  <label>
                    English name
                    <input
                      value={form.englishName}
                      onChange={(e) =>
                        setForm({ ...form, englishName: e.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    Thai name (optional)
                    <input
                      value={form.thaiName}
                      onChange={(e) =>
                        setForm({ ...form, thaiName: e.target.value })
                      }
                    />
                  </label>
                </div>
                <label>
                  Synthetic ID number
                  <input
                    value={form.syntheticId}
                    onChange={(e) =>
                      setForm({ ...form, syntheticId: e.target.value })
                    }
                    required
                  />
                </label>
                <div className="registertwocol">
                  <label>
                    Date of birth
                    <input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) =>
                        setForm({ ...form, dateOfBirth: e.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    Mobile number
                    <input
                      value={form.mobile}
                      onChange={(e) =>
                        setForm({ ...form, mobile: e.target.value })
                      }
                      required
                    />
                  </label>
                </div>
                <label>
                  Email address
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                  />
                </label>
                <label className="consent">
                  <input
                    type="checkbox"
                    checked={form.marketingConsent}
                    onChange={(e) =>
                      setForm({ ...form, marketingConsent: e.target.checked })
                    }
                  />{" "}
                  I agree to receive synthetic product information.
                </label>
                <p className="existinglogin">
                  Already use Internet Banking?{" "}
                  <a
                    href={internetBankUrl(`/login?return=${encodeURIComponent(`${PUBLIC_BANK_URL}/products/${product.category === "CARD" ? "cards" : product.category === "LOAN" ? "loans" : product.category === "INVESTMENT" ? "investments" : "deposit"}`)}`)}
                  >
                    Sign in and apply with your existing profile
                  </a>
                  .
                </p>
              </>
            )}
            {error && <div className="retailerror">{error}</div>}
            <button disabled={busy}>
              {busy ? "Submitting…" : "Submit application for review"}
            </button>
            <small>
              No product is opened until an administrator approves the request.
            </small>
          </form>
        )}
      </section>
    </div>
  );
}

function Register() {
  const params = new URLSearchParams(location.search);
  const initialReference = params.get("reference") || "";
  const [form, setForm] = useState<AnyRecord>({
    customerIdentifier: "",
    syntheticId: "",
    dateOfBirth: "",
    mobile: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [result, setResult] = useState<AnyRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const loadStatus = async (reference: string) => {
    setBusy(true);
    setError("");
    const response = await fetch(
      `/retail/auth/registration/${encodeURIComponent(reference)}`,
    );
    const body = await response.json().catch(() => ({}));
    response.ok
      ? setResult(body)
      : setError(body.message || "Registration was not found");
    setBusy(false);
  };
  useEffect(() => {
    if (initialReference) loadStatus(initialReference);
  }, []);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch("/retail/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      setResult(body);
      history.replaceState(
        null,
        "",
        `/register?reference=${encodeURIComponent(body.registrationReference)}`,
      );
    } else setError(body.message || "Unable to submit registration");
    setBusy(false);
  };
  return (
    <main className="registrationmain">
      <section className="registrationintro">
        <span className="retailkicker">INTERNET BANKING REGISTRATION</span>
        <h1>Start banking online.</h1>
        <p>
          Register with the identity details already held in MFEC Core Banking.
          Your access is enabled only after KYC verification and administrator
          approval.
        </p>
        <div className="registrationflow">
          <div>
            <b>1</b>
            <span>
              <strong>Prove identity</strong>
              <small>Match your customer record</small>
            </span>
          </div>
          <div>
            <b>2</b>
            <span>
              <strong>KYC verification</strong>
              <small>Validate your bank-held details</small>
            </span>
          </div>
          <div>
            <b>3</b>
            <span>
              <strong>Admin approval</strong>
              <small>Core Banking enables access</small>
            </span>
          </div>
        </div>
      </section>
      {result ? (
        <section className="registrationresult">
          <ShieldCheck />
          <span className="retailkicker">APPLICATION STATUS</span>
          <h2>{result.status?.replaceAll("_", " ")}</h2>
          <p>
            Your KYC status is <b>{result.kycStatus}</b>. Keep this reference to
            check your request.
          </p>
          <div>
            <small>Registration reference</small>
            <strong>{result.registrationReference}</strong>
          </div>
          {result.rejectionReason && (
            <div className="retailerror">{result.rejectionReason}</div>
          )}
          <button
            onClick={() => loadStatus(result.registrationReference)}
            disabled={busy}
          >
            {busy ? "Checking…" : "Refresh status"}
          </button>
          {result.status === "ACTIVE" ? (
            <a href={internetBankUrl("/login")}>
              Continue to sign in <ArrowRight />
            </a>
          ) : (
            <small>
              MFEC Bank administration must approve this request before you can
              sign in.
            </small>
          )}
        </section>
      ) : (
        <form className="registerform" onSubmit={submit}>
          <h2>Verify your identity</h2>
          <p>All fields must match your existing synthetic customer profile.</p>
          <label>
            Customer ID or CIF
            <input
              autoFocus
              value={form.customerIdentifier}
              onChange={(e) =>
                setForm({ ...form, customerIdentifier: e.target.value })
              }
              required
            />
          </label>
          <label>
            Synthetic ID number
            <input
              value={form.syntheticId}
              onChange={(e) =>
                setForm({ ...form, syntheticId: e.target.value })
              }
              required
            />
          </label>
          <div className="registertwocol">
            <label>
              Date of birth
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) =>
                  setForm({ ...form, dateOfBirth: e.target.value })
                }
                required
              />
            </label>
            <label>
              Registered mobile number
              <input
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                required
              />
            </label>
          </div>
          <label>
            Choose username
            <input
              autoComplete="username"
              minLength={4}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </label>
          <div className="registertwocol">
            <label>
              Password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                required
              />
            </label>
          </div>
          {error && <div className="retailerror">{error}</div>}
          <button disabled={busy}>
            {busy ? "Verifying…" : "Verify identity and submit"}
          </button>
          <small>This demonstration uses synthetic identity data only.</small>
        </form>
      )}
    </main>
  );
}

function Login({ onLogin }: { onLogin: (s: any) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/retail/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.message || "Unable to sign in");
      setBusy(false);
      return;
    }
    const session = await (
      await fetch("/retail/auth/session", { credentials: "include" })
    ).json();
    onLogin(session);
    const target = new URLSearchParams(location.search).get("return");
    if (target) {
      try {
        const parsed = new URL(target, PUBLIC_BANK_URL);
        if (parsed.protocol === "https:" && ["mfecbank.demohub24.com", "ibank.demohub24.com"].includes(parsed.hostname)) {
          location.href = parsed.href;
          return;
        }
      } catch {}
    }
    location.href = "/banking";
  };
  return (
    <main className="loginmain">
      <section className="customerlogin">
        <div className="loginwelcome">
          <span className="retailkicker">MFEC INTERNET BANKING</span>
          <h1>Welcome back.</h1>
          <p>
            Access your accounts, cards, loans, investments and transaction
            history securely.
          </p>
          <div>
            <ShieldCheck />
            <span>
              <b>Protected customer session</b>
              <small>Access is controlled by MFEC Core Banking</small>
            </span>
          </div>
        </div>
        <form onSubmit={submit}>
          <LockKeyhole />
          <h2>Internet Banking login</h2>
          <p>Enter your customer banking credentials.</p>
          <label>
            Username
            <input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <div className="retailerror">{error}</div>}
          <button disabled={busy || !username || !password}>
            {busy ? "Signing in…" : "Sign in securely"}
          </button>
          <small>
            Repeated unsuccessful attempts will automatically lock access based
            on the bank policy.
          </small>
          <a className="registerlink" href={internetBankUrl("/register")}>
            New customer? Register for Internet Banking
          </a>
        </form>
      </section>
    </main>
  );
}

function InternetBanking({ session }: { session: any }) {
  const [data, setData] = useState<AnyRecord | null>(null);
  const [error, setError] = useState("");
  const load = () =>
    fetch("/retail/dashboard", { credentials: "include" })
      .then(async (r) => {
        if (r.status === 401) {
          location.href = "/login?return=/banking";
          return null;
        }
        if (!r.ok) throw new Error((await r.json()).message);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, []);
  const logout = async () => {
    await fetch("/retail/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    location.href = "/";
  };
  if (!data)
    return (
      <main className="bankingmain">
        <div className="bankloading">
          {error || "Loading your banking relationship…"}
        </div>
      </main>
    );
  return (
    <main className="bankingmain">
      <section className="bankwelcome">
        <div>
          <span>GOOD DAY</span>
          <h1>{data.customer.englishName}</h1>
          <p>
            CIF {data.customer.cif} · Last secure login{" "}
            {session?.credential?.lastLoginAt
              ? new Date(session.credential.lastLoginAt).toLocaleString("th-TH")
              : "Now"}
          </p>
        </div>
        <button onClick={logout}>Sign out</button>
      </section>
      <section className="banksummary">
        <div>
          <small>Total deposit balance</small>
          <b>
            {money(
              data.accounts.reduce(
                (s: number, a: any) => s + Number(a.balance),
                0,
              ),
            )}
          </b>
          <span>{data.accounts.length} account(s)</span>
        </div>
        <div>
          <small>Available card credit</small>
          <b>
            {money(
              data.cards.reduce(
                (s: number, c: any) => s + Number(c.availableCredit),
                0,
              ),
            )}
          </b>
          <span>{data.cards.length} card(s)</span>
        </div>
        <div>
          <small>Loan outstanding</small>
          <b>
            {money(
              data.loans.reduce(
                (s: number, l: any) => s + Number(l.outstandingPrincipal),
                0,
              ),
            )}
          </b>
          <span>{data.loans.length} loan(s)</span>
        </div>
        <div>
          <small>Portfolio value</small>
          <b>
            {money(
              data.investments.reduce(
                (s: number, i: any) => s + Number(i.marketValue),
                0,
              ),
            )}
          </b>
          <span>{data.investments.length} holding(s)</span>
        </div>
      </section>
      <div className="bankgrid">
        <section className="bankpanel">
          <h2>My accounts</h2>
          {data.accounts.map((a: any) => (
            <div className="accountrow" key={a.id}>
              <span>
                <b>{a.type.replaceAll("_", " ")}</b>
                <small>
                  {a.maskedNumber} · {a.status}
                  {a.frozen ? " · FROZEN" : ""}
                </small>
              </span>
              <span className="accountactions">
                <strong>{money(a.availableBalance)}</strong>
                <button onClick={() => downloadStatement(data.customer, a)}>
                  Download PDF statement
                </button>
              </span>
            </div>
          ))}
        </section>
        <Transfer accounts={data.accounts} onDone={load} />
        <section className="bankpanel wide">
          <h2>Recent transactions</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts
                .flatMap((a: any) => a.transactions)
                .sort(
                  (a: any, b: any) =>
                    +new Date(b.occurredAt) - +new Date(a.occurredAt),
                )
                .slice(0, 10)
                .map((t: any) => (
                  <tr key={t.id}>
                    <td>{new Date(t.occurredAt).toLocaleString("th-TH")}</td>
                    <td>{t.description}</td>
                    <td>{t.type}</td>
                    <td className={Number(t.amount) < 0 ? "debit" : "credit"}>
                      {money(t.amount)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
        <section className="bankpanel">
          <h2>Cards and loans</h2>
          {data.cards.map((c: any) => (
            <div className="accountrow" key={c.id}>
              <span>
                <b>{c.product}</b>
                <small>
                  {c.maskedNumber} · {c.status}
                </small>
              </span>
              <strong>{money(c.availableCredit)}</strong>
            </div>
          ))}
          {data.loans.map((l: any) => (
            <div className="accountrow" key={l.id}>
              <span>
                <b>{l.product.replaceAll("_", " ")}</b>
                <small>
                  Next due {new Date(l.nextDueDate).toLocaleDateString("th-TH")}
                </small>
              </span>
              <strong>{money(l.outstandingPrincipal)}</strong>
            </div>
          ))}
        </section>
        <section className="bankpanel">
          <h2>Product applications</h2>
          {data.productApplications.length ? (
            data.productApplications.map((a: any) => (
              <div className="accountrow" key={a.id}>
                <span>
                  <b>{a.productName}</b>
                  <small>{a.reference}</small>
                </span>
                <strong>{a.status}</strong>
              </div>
            ))
          ) : (
            <p className="bankempty">No applications yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
function Transfer({
  accounts,
  onDone,
}: {
  accounts: any[];
  onDone: () => void;
}) {
  const [source, setSource] = useState(accounts[0]?.id || "");
  const [destination, setDestination] = useState("");
  const [beneficiary, setBeneficiary] = useState<AnyRecord | null>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const lookup = async () => {
    setBeneficiary(null);
    setMessage("Checking destination…");
    const response = await fetch(
      `/retail/accounts/lookup?number=${encodeURIComponent(destination)}`,
      { credentials: "include" },
    );
    const result = await response.json();
    if (response.ok) {
      setBeneficiary(result);
      setMessage("Destination account verified");
    } else setMessage(result.message || "Destination account was not found");
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("Processing…");
    const response = await fetch("/retail/transfers", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceAccountId: source,
        destination: beneficiary?.id || destination,
        amount,
        channel: "INTERNET_BANKING",
      }),
    });
    const result = await response.json();
    setMessage(
      response.ok
        ? `Transfer successful · ${result.reference}`
        : result.message,
    );
    if (response.ok) {
      setAmount("");
      setDestination("");
      setBeneficiary(null);
      onDone();
    }
  };
  return (
    <section className="bankpanel transfer">
      <h2>Transfer money</h2>
      <form onSubmit={submit}>
        <label>
          From account
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {accounts
              .filter((a) => a.status === "ACTIVE" && !a.frozen)
              .map((a) => (
                <option value={a.id} key={a.id}>
                  {a.type} · {a.maskedNumber} · {money(a.availableBalance)}
                </option>
              ))}
          </select>
        </label>
        <label>
          Destination account ID / masked number
          <div className="lookupfield">
            <input
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setBeneficiary(null);
              }}
              placeholder="Enter another MFEC Bank account"
            />
            <button type="button" onClick={lookup} disabled={!destination}>
              Verify
            </button>
          </div>
        </label>
        {beneficiary && (
          <div className="beneficiary">
            <Check />
            <span>
              <b>{beneficiary.accountName}</b>
              <small>
                {beneficiary.type} · {beneficiary.maskedNumber}
              </small>
            </span>
          </div>
        )}
        <label>
          Amount (THB)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <button disabled={!source || !destination || !amount}>
          Review and transfer
        </button>
        {message && <div className="transfermessage">{message}</div>}
        <small className="realtimehint">
          Balances refresh automatically every 4 seconds for both customers.
        </small>
      </form>
    </section>
  );
}
function Footer() {
  return (
    <footer>
      <div className="retaillogo">
        <img
          className="retail-logo-transparent"
          src="/mfec-logo-transparent.png"
          alt="MFEC"
        />
      </div>
      <p>
        Demo environment only. No real customer data, accounts, payments,
        investments or financial advice.
      </p>
      <div>
        <a href={`${PUBLIC_BANK_URL}/products/deposit`}>Products</a>
        <a href={internetBankUrl("/login")}>Internet Banking</a>
        <a href={BACKEND_URL}>Operations Portal</a>
      </div>
    </footer>
  );
}
