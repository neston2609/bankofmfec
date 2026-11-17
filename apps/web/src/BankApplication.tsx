import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CreditCard,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
  WalletCards,
} from "lucide-react";
import "./domain.css";

type AnyRecord = Record<string, any>;
const scenario: Record<string, string> = {
  card: "CUST000001",
  fraud: "CUST000001",
  "internet-banking": "CUST000002",
  loan: "CUST000003",
  collection: "CUST000003",
  campaign: "CUST000005",
  payment: "CUST000006",
};
const customerProducts: Record<string, { domain: string; label: string }> = {
  DEPOSIT_ACCOUNT: { domain: "core", label: "Core Banking" },
  CREDIT_CARD: { domain: "card", label: "Credit Card" },
  LOAN: { domain: "loan", label: "Loan" },
  INVESTMENT: { domain: "wealth", label: "Investment / Wealth" },
  MOBILE_BANKING: { domain: "mobile", label: "Mobile Banking" },
  INTERNET_BANKING: { domain: "internet-banking", label: "Internet Banking" },
};
const money = (value: any) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(
    Number(value || 0),
  );
const date = (value: any) =>
  value ? new Date(value).toLocaleString("th-TH") : "—";

export default function BankApplication({
  domain,
  title,
}: {
  domain: string;
  title: string;
}) {
  const [customerId, setCustomerId] = useState(
    scenario[domain] || "CUST000001",
  );
  const [searchQuery, setSearchQuery] = useState(
    scenario[domain] || "CUST000001",
  );
  const [productFilter, setProductFilter] = useState("ALL");
  const [searchResults, setSearchResults] = useState<AnyRecord[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [productSummary, setProductSummary] = useState<AnyRecord>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [data, setData] = useState<AnyRecord | null>(null);
  const [extra, setExtra] = useState<AnyRecord>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accountTransactions, setAccountTransactions] = useState<AnyRecord[]>([]);
  const [accountTransactionPage, setAccountTransactionPage] = useState(1);
  const [accountTransactionTotal, setAccountTransactionTotal] = useState(0);
  const [accountTransactionsBusy, setAccountTransactionsBusy] = useState(false);
  const [accountTransactionsError, setAccountTransactionsError] = useState("");
  const [accountTransactionRefresh, setAccountTransactionRefresh] = useState(0);
  const [generatedCredential, setGeneratedCredential] = useState<AnyRecord | null>(null);
  const [customerModal, setCustomerModal] = useState<
    "create" | "detail" | "modify" | "delete" | null
  >(null);
  const [modalCustomer, setModalCustomer] = useState<AnyRecord | null>(null);
  const [navigationBusy, setNavigationBusy] = useState(false);
  const [navigatingProduct, setNavigatingProduct] = useState("");
  const load = async (id = customerId) => {
    setBusy(true);
    setMessage("");
    try {
      let resolvedId = id;
      let response = await fetch(`/api/customers/${encodeURIComponent(resolvedId)}/360`, {
        credentials: "include",
      });
      if (response.status === 404) {
        const fallbackResponse = await fetch(
          "/api/customers/search?q=&product=ALL&page=1&pageSize=1",
          { credentials: "include" },
        );
        if (!fallbackResponse.ok) throw new Error("Unable to find an available customer");
        const fallback = await fallbackResponse.json();
        const firstCustomer = fallback.items?.[0];
        if (!firstCustomer) {
          setData(null);
          setMessage("No customers found. Create a customer from Customer / CIF to continue.");
          return;
        }
        resolvedId = firstCustomer.id;
        setCustomerId(resolvedId);
        setSearchQuery(resolvedId);
        const params = new URLSearchParams(window.location.search);
        params.delete("customerId");
        const query = params.toString();
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
        );
        response = await fetch(`/api/customers/${encodeURIComponent(resolvedId)}/360`, {
          credentials: "include",
        });
      }
      if (!response.ok) throw new Error("Unable to load customer information");
      const next = await response.json();
      setData(next);
      if (domain === "cif") {
        const productSummaryResponse = await fetch("/api/customers/product-summary", {
          credentials: "include",
        });
        if (productSummaryResponse.ok) setProductSummary(await productSummaryResponse.json());
      }
      if (domain === "internet-banking") {
        const [internetBanking, settings] = await Promise.all([
          fetch(`/api/internet-banking?customerId=${encodeURIComponent(resolvedId)}`, {
            credentials: "include",
          }).then((r) => r.json()),
          fetch("/api/internet-banking-settings", {
            credentials: "include",
          }).then((r) => r.json()),
        ]);
        setExtra({ internetBanking, settings });
      }
      if (domain === "notify") {
        setExtra({
          notifications: await (
            await fetch(`/api/notifications?customerId=${encodeURIComponent(resolvedId)}`, {
              credentials: "include",
            })
          ).json(),
        });
      }
      if (domain === "admin") {
        const [summary, audit, productApplications] = await Promise.all([
          fetch("/api/admin/summary", { credentials: "include" }).then((r) => r.json()),
          fetch("/api/audit", { credentials: "include" }).then((r) => r.json()),
          fetch("/api/product-applications", { credentials: "include" }).then((r) => r.json()),
        ]);
        setExtra({ summary, audit, productApplications });
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load banking data",
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    const initialCustomer =
      new URLSearchParams(window.location.search).get("customerId")?.trim() ||
      scenario[domain] ||
      "CUST000001";
    setCustomerId(initialCustomer);
    setSearchQuery(initialCustomer);
    setSearchResults([]);
    setHasSearched(false);
    setSelectedAccountId("");
    setAccountTransactionPage(1);
    load(initialCustomer);
  }, [domain]);
  const activeAccountId = data?.accounts?.some(
    (account: AnyRecord) => account.id === selectedAccountId,
  )
    ? selectedAccountId
    : data?.accounts?.[0]?.id || "";
  useEffect(() => {
    if (domain !== "core") return;
    if (!activeAccountId) {
      setAccountTransactions([]);
      setAccountTransactionTotal(0);
      setAccountTransactionsError("");
      setAccountTransactionsBusy(false);
      return;
    }

    let cancelled = false;
    const loadAccountTransactions = async () => {
      setAccountTransactionsBusy(true);
      setAccountTransactionsError("");
      try {
        const query = new URLSearchParams({
          page: String(accountTransactionPage),
        });
        const response = await fetch(
          `/api/accounts/${encodeURIComponent(activeAccountId)}/transactions?${query}`,
          { credentials: "include" },
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(result.message || "Unable to load account transactions");
        if (cancelled) return;
        setAccountTransactions(result.items || []);
        setAccountTransactionPage(result.page || accountTransactionPage);
        setAccountTransactionTotal(result.total || 0);
      } catch (error) {
        if (cancelled) return;
        setAccountTransactions([]);
        setAccountTransactionTotal(0);
        setAccountTransactionsError(
          error instanceof Error
            ? error.message
            : "Unable to load account transactions",
        );
      } finally {
        if (!cancelled) setAccountTransactionsBusy(false);
      }
    };

    void loadAccountTransactions();
    return () => {
      cancelled = true;
    };
  }, [domain, activeAccountId, accountTransactionPage, accountTransactionRefresh, data?.customer?.id, data?.accounts]);
  const searchCustomers = async (
    requestedPage = 1,
    requestedProduct = productFilter,
    requestedPageSize = pageSize,
    requestedQuery = searchQuery,
  ) => {
    setSearchBusy(true);
    setMessage("");
    try {
      const params = new URLSearchParams({
        q: requestedQuery.trim(),
        product: requestedProduct,
        page: String(requestedPage),
        pageSize: String(requestedPageSize),
      });
      const response = await fetch(`/api/customers/search?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Unable to search customers");
      const result = await response.json();
      setSearchResults(result.items);
      setPage(result.page);
      setPageSize(result.pageSize);
      setTotalResults(result.total);
      setTotalPages(result.totalPages);
      setHasSearched(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to search customers");
    } finally {
      setSearchBusy(false);
    }
  };
  const selectCustomer = async (id: string) => {
    setCustomerId(id);
    setSearchQuery(id);
    await load(id);
  };
  const selectProductWidget = (product: string) => {
    setProductFilter(product);
    setSearchQuery("");
    searchCustomers(1, product, pageSize, "");
  };
  const openCustomerProduct = async (customer: AnyRecord, product: string) => {
    const target = customerProducts[product];
    if (!target || navigationBusy) return;
    setNavigationBusy(true);
    setNavigatingProduct(product);
    setMessage("");
    try {
      const response = await fetch(
        `/api/customers/${encodeURIComponent(customer.id)}/has-product/${target.domain}`,
        { credentials: "include" },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Unable to verify customer product");
      if (!result.available) {
        setMessage(`${customer.englishName} does not currently have ${target.label}`);
        return;
      }
      window.location.assign(
        `/${target.domain}?customerId=${encodeURIComponent(customer.id)}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to open customer product");
    } finally {
      setNavigationBusy(false);
      setNavigatingProduct("");
    }
  };
  const generateInternetBanking = async (customer: AnyRecord) => {
    setBusy(true);
    setMessage("");
    setGeneratedCredential(null);
    try {
      const response = await fetch(
        `/api/customers/${encodeURIComponent(customer.id)}/internet-banking/generate`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "X-Correlation-ID": crypto.randomUUID(),
          },
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Unable to generate Internet Banking access");
      setGeneratedCredential({ ...result.credential, initialPassword: result.initialPassword });
      setMessage(`Internet Banking access created · ${result.reference}`);
      await searchCustomers(page, productFilter, pageSize);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate Internet Banking access");
    } finally {
      setBusy(false);
    }
  };
  const action = async (url: string, method: string, body?: AnyRecord) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Correlation-ID": crypto.randomUUID(),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Transaction failed");
      setMessage(
        `Transaction completed${result.reference ? ` · ${result.reference}` : ""}`,
      );
      await load();
      return result;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Transaction failed");
    } finally {
      setBusy(false);
    }
  };
  const createCustomerProduct = async (
    targetCustomerId: string,
    productType: string,
    values: AnyRecord,
  ) => {
    setBusy(true);
    setMessage("");
    try {
      const routes: Record<string, string> = {
        account: "/api/accounts",
        card: "/api/cards",
        loan: "/api/loans",
        investment: "/api/investments",
        mobile: "/api/mobile",
      };
      const isInternetBanking = productType === "internet-banking";
      const response = await fetch(
        isInternetBanking
          ? `/api/customers/${encodeURIComponent(targetCustomerId)}/internet-banking/generate`
          : routes[productType],
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-Correlation-ID": crypto.randomUUID(),
          },
          body: isInternetBanking
            ? undefined
            : JSON.stringify({ ...values, customerId: targetCustomerId }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Unable to open product");
      const detailResponse = await fetch(
        `/api/customers/${encodeURIComponent(targetCustomerId)}/360`,
        { credentials: "include" },
      );
      if (!detailResponse.ok) throw new Error("Product created, but customer detail could not be refreshed");
      const refreshed = await detailResponse.json();
      setModalCustomer(refreshed);
      if (data?.customer?.id === targetCustomerId) setData(refreshed);
      setMessage(
        `${productType === "internet-banking" ? "Internet Banking" : productType.charAt(0).toUpperCase() + productType.slice(1)} added to customer${result.reference ? ` · ${result.reference}` : ""}`,
      );
      return result;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to open product");
      return null;
    } finally {
      setBusy(false);
    }
  };
  const openCustomerModal = async (
    mode: "create" | "detail" | "modify" | "delete",
    customer?: AnyRecord,
  ) => {
    setCustomerModal(mode);
    setModalCustomer(null);
    if (mode === "create" || !customer?.id) return;
    try {
      const response = await fetch(
        `/api/customers/${encodeURIComponent(customer.id)}${mode === "detail" ? "/360" : ""}`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("Unable to load customer information");
      setModalCustomer(await response.json());
    } catch (error) {
      setCustomerModal(null);
      setMessage(error instanceof Error ? error.message : "Unable to load customer");
    }
  };
  const deleteCustomer = async () => {
    if (!modalCustomer?.id) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/customers/${encodeURIComponent(modalCustomer.id)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "X-Correlation-ID": crypto.randomUUID() },
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Delete failed");
      setCustomerModal(null);
      setModalCustomer(null);
      setMessage(`Transaction completed · ${result.reference}`);
      await searchCustomers(1);
      if (result.nextCustomerId) {
        setCustomerId(result.nextCustomerId);
        await load(result.nextCustomerId);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };
  if (!data)
    return (
      <section className="domainloading">
        {busy ? <LoaderCircle /> : <AlertTriangle />}
        <p>{message || "Loading persistent banking data…"}</p>
        <button onClick={() => load()}>Retry</button>
      </section>
    );
  return (
    <>
      <section className="domainhero">
        <div>
          <span>LIVE MOCK BANKING SYSTEM</span>
          <h1>{title}</h1>
          <p>Persistent PostgreSQL operations · Synthetic data only</p>
        </div>
        <DomainIcon domain={domain} />
      </section>
      {domain === "cif" && (
        <section className="productwidgets" aria-label="Customers by product">
          {[
            ["ALL", "All customers", Users],
            ["DEPOSIT_ACCOUNT", "Deposit accounts", Landmark],
            ["CREDIT_CARD", "Credit cards", CreditCard],
            ["LOAN", "Loans", BriefcaseBusiness],
            ["INVESTMENT", "Investments", WalletCards],
            ["INTERNET_BANKING", "Internet Banking", ShieldCheck],
          ].map(([product, label, Icon]: any) => (
            <button
              key={product}
              className={productFilter === product && hasSearched ? "active" : ""}
              onClick={() => selectProductWidget(product)}
              data-testid={`product-widget-${product}`}
            >
              <Icon />
              <span>{label}</span>
              <b>{productSummary[product] ?? "—"}</b>
            </button>
          ))}
        </section>
      )}
      <section className="customerbar">
        <label>
          Customer / CIF / ID number / Name
          <input
            data-testid="customer-search"
            value={searchQuery}
            placeholder="Enter any part of customer ID, CIF, ID number or name"
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") searchCustomers(1);
            }}
          />
        </label>
        <label>
          Product
          <select
            data-testid="product-filter"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          >
            <option value="ALL">All products</option>
            <option value="DEPOSIT_ACCOUNT">Deposit account</option>
            <option value="CREDIT_CARD">Credit card</option>
            <option value="LOAN">Loan</option>
            <option value="INVESTMENT">Investment</option>
            <option value="INTERNET_BANKING">Internet Banking</option>
          </select>
        </label>
        <button data-testid="search-button" onClick={() => searchCustomers(1)} disabled={searchBusy}>
          <Search /> {searchBusy ? "Searching…" : "Search"}
        </button>
        {domain === "cif" && (
          <button
            type="button"
            data-testid="create-new-customer-button"
            onClick={() => openCustomerModal("create")}
          >
            Create New Customer
          </button>
        )}
        <div>
          <b>{data.customer.englishName}</b>
          <small>
            {data.customer.cif} · {data.customer.segment} · KYC{" "}
            {data.customer.kycStatus}
          </small>
        </div>
      </section>
      {hasSearched && (
        <section className="customerresults" data-testid="customer-search-results">
          <div className="customerresultshead">
            <div>
              <h2>Customer search results</h2>
              <p>Select a customer to open the full customer detail below.</p>
            </div>
            <div className="resultcontrols">
              <b>{totalResults} result{totalResults === 1 ? "" : "s"}</b>
              <label>Rows
                <select value={pageSize} onChange={(e) => searchCustomers(1, productFilter, Number(e.target.value))} data-testid="result-page-size">
                  {[10, 20, 50, 75, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
            </div>
          </div>
          {searchResults.length ? (
            <><div className="domaintable">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Customer ID / CIF / ID number</th>
                    <th>Segment</th>
                    <th>KYC</th>
                    <th>Products</th>
                    <th>Relationship balance</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((customer) => (
                    <tr key={customer.id} className={customer.id === customerId ? "selected" : ""}>
                      <td><button
                        type="button"
                        className="customernamebutton"
                        data-testid={`customer-detail-${customer.id}`}
                        onClick={() => openCustomerModal("detail", customer)}
                      >{customer.englishName}</button><small>{customer.thaiName}</small></td>
                      <td><b>{customer.id}</b><small>{customer.cif} · {customer.idNumber}</small></td>
                      <td><span className="state">{customer.segment}</span></td>
                      <td><span className={`state ${customer.kycStatus === "VERIFIED" ? "ACTIVE" : "PENDING"}`}>{customer.kycStatus}</span></td>
                      <td><div className="producttags">{customer.productTypes.map((product: string) => <button type="button" className="customerproductlink" key={product} disabled={navigationBusy} data-testid={`customer-product-${customer.id}-${product}`} aria-label={`Open ${customerProducts[product]?.label || product} for ${customer.englishName}`} onClick={() => openCustomerProduct(customer, product)}>{navigatingProduct === product ? "Opening…" : product.replaceAll("_", " ")}</button>)}</div></td>
                      <td><b>{money(customer.relationshipBalance)}</b></td>
                      <td>
                        {domain === "cif" ? (
                          <div className="customeractions">
                            <button type="button" onClick={() => openCustomerModal("detail", customer)}>Detail</button>
                            {!customer.productTypes.includes("INTERNET_BANKING") && <button type="button" disabled={busy} onClick={() => generateInternetBanking(customer)}>Generate Internet Banking</button>}
                            <button type="button" onClick={() => openCustomerModal("modify", customer)}>Modify</button>
                            <button type="button" className="danger" onClick={() => openCustomerModal("delete", customer)}>Delete</button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            data-testid={`select-customer-${customer.id}`}
                            onClick={() => selectCustomer(customer.id)}
                          >
                            Select
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="resultpagination" aria-label="Customer result pages">
              <button disabled={page <= 1 || searchBusy} onClick={() => searchCustomers(page - 1)}>Previous</button>
              <span>Page <b>{page}</b> of <b>{totalPages}</b></span>
              <button disabled={page >= totalPages || searchBusy} onClick={() => searchCustomers(page + 1)}>Next</button>
            </nav></>
          ) : (
            <Empty text="No customers match this keyword and product filter" />
          )}
        </section>
      )}
      {message && (
        <div
          className={
            message.startsWith("Transaction completed")
              ? "flash success"
              : "flash"
          }
        >
          {message}
        </div>
      )}
      {generatedCredential && (
        <section className="generatedcredential" aria-live="polite" data-testid="generated-internet-banking-credentials">
          <div>
            <h2>Internet Banking account created</h2>
            <p>Share these temporary sign-in details securely. The temporary password is shown only once.</p>
          </div>
          <dl>
            <div><dt>Customer ID</dt><dd>{generatedCredential.customerId}</dd></div>
            <div><dt>Username</dt><dd>{generatedCredential.username}</dd></div>
            <div><dt>Temporary password</dt><dd><code>{generatedCredential.initialPassword}</code></dd></div>
          </dl>
          <a href="https://bankofmfec.demohub24.com/login" target="_blank" rel="noreferrer">Open Customer Internet Banking login</a>
          <button type="button" aria-label="Dismiss generated password" onClick={() => setGeneratedCredential(null)}>Hide password</button>
        </section>
      )}
      {domain === "cif" && customerModal && (
        <CustomerModal
          mode={customerModal}
          customer={modalCustomer}
          busy={busy}
          close={() => {
            setCustomerModal(null);
            setModalCustomer(null);
          }}
          create={async (values) => {
            const result = await action("/api/customers", "POST", values);
            if (!result?.customer) return;
            setCustomerModal(null);
            await selectCustomer(result.customer.id);
            await searchCustomers(1);
          }}
          modify={async (values) => {
            if (!modalCustomer?.id) return;
            const result = await action(
              `/api/customers/${modalCustomer.id}/profile`,
              "PATCH",
              values,
            );
            if (!result) return;
            setCustomerModal(null);
            await selectCustomer(modalCustomer.id);
            await searchCustomers(page);
          }}
          remove={deleteCustomer}
          createProduct={createCustomerProduct}
        />
      )}
      {domain !== "cif" && <CreationTools domain={domain} data={data} extra={extra} action={action} selectedAccountId={activeAccountId} onAccountSelect={(id) => { setSelectedAccountId(id); setAccountTransactionPage(1); }} onAccountTransactionChange={() => setAccountTransactionRefresh((value) => value + 1)} />}
      {domain !== "cif" && (
        <DomainView
          domain={domain}
          data={data}
          extra={extra}
          action={action}
          busy={busy}
          accountTransactions={accountTransactions}
          accountTransactionPage={accountTransactionPage}
          accountTransactionTotal={accountTransactionTotal}
          accountTransactionsBusy={accountTransactionsBusy}
          accountTransactionsError={accountTransactionsError}
          onAccountTransactionPage={setAccountTransactionPage}
          onAccountTransactionChange={() => setAccountTransactionRefresh((value) => value + 1)}
          selectedAccount={data.accounts.find((account: AnyRecord) => account.id === activeAccountId) || data.accounts[0]}
        />
      )}
    </>
  );
}

function CustomerModal({
  mode,
  customer,
  busy,
  close,
  create,
  modify,
  remove,
  createProduct,
}: {
  mode: "create" | "detail" | "modify" | "delete";
  customer: AnyRecord | null;
  busy: boolean;
  close: () => void;
  create: (values: AnyRecord) => void;
  modify: (values: AnyRecord) => void;
  remove: () => void;
  createProduct: (customerId: string, productType: string, values: AnyRecord) => Promise<AnyRecord | null>;
}) {
  const title =
    mode === "create"
      ? "Create New Customer"
      : mode === "detail"
        ? "Customer Detail"
        : mode === "modify"
          ? "Modify Customer"
          : "Delete Customer";
  const profile = customer?.customer || customer;
  const fields = profile
    ? [
        { name: "englishName", label: "English name", value: profile.englishName },
        { name: "thaiName", label: "Thai name", value: profile.thaiName },
        { name: "idNumber", label: "ID number", value: profile.idNumber || "XXXXXXXXXXX" },
        { name: "dateOfBirth", label: "Date of birth", type: "date", value: new Date(profile.dateOfBirth).toISOString().slice(0, 10) },
        { name: "mobile", label: "Mobile", value: profile.mobile },
        { name: "email", label: "Email", value: profile.email },
        { name: "segment", label: "Segment", value: profile.segment, options: ["MASS", "AFFLUENT", "PLATINUM", "PRIVATE"] },
        { name: "risk", label: "Risk level", value: profile.risk, options: ["LOW", "MEDIUM", "HIGH"] },
        { name: "preferredLanguage", label: "Preferred language", value: profile.preferredLanguage, options: ["TH", "EN"] },
        { name: "preferredChannel", label: "Preferred channel", value: profile.preferredChannel, options: ["VOICE", "MOBILE", "EMAIL", "SMS"] },
      ]
    : [
        { name: "englishName", label: "English name" },
        { name: "thaiName", label: "Thai name" },
        { name: "idNumber", label: "ID number" },
        { name: "dateOfBirth", label: "Date of birth", type: "date" },
        { name: "mobile", label: "Mobile" },
        { name: "email", label: "Email" },
        { name: "segment", label: "Segment", options: ["MASS", "AFFLUENT", "PLATINUM", "PRIVATE"] },
        { name: "risk", label: "Risk level", options: ["LOW", "MEDIUM", "HIGH"] },
        { name: "kycStatus", label: "Initial KYC", options: ["NOT_VERIFIED", "PARTIALLY_VERIFIED", "VERIFIED"] },
      ];
  return (
    <div className="modalbackdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className="customermodal" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div><small>CUSTOMER / CIF</small><h2>{title}</h2></div>
          <button type="button" aria-label="Close" onClick={close}>×</button>
        </header>
        <div className="modalbody">
          {mode !== "create" && !customer ? (
            <div className="empty">Loading customer information…</div>
          ) : mode === "detail" && customer && profile ? (
            <div className="customer360detail">
              <div className="profilegrid">
                <Fact k="Customer ID" v={profile.id} />
                <Fact k="CIF" v={profile.cif} />
                <Fact k="ID number" v={profile.idNumber} />
                <Fact k="English name" v={profile.englishName} />
                <Fact k="Thai name" v={profile.thaiName} />
                <Fact k="Date of birth" v={date(profile.dateOfBirth)} />
                <Fact k="Mobile" v={profile.mobile} />
                <Fact k="Email" v={profile.email} />
                <Fact k="Segment" v={profile.segment} />
                <Fact k="KYC status" v={profile.kycStatus} />
                <Fact k="Risk" v={profile.risk} />
                <Fact k="Preferred channel" v={profile.preferredChannel} />
              </div>
              <h3>Customer products</h3>
              {customer.accounts?.length > 0 && <ProductDetail title="Deposit accounts" headers={["Account number", "Type", "Balance", "Available balance", "Status", "Opened"]} rows={customer.accounts.map((item: any) => [item.accountNumber || "Unavailable", item.type, money(item.balance), money(item.availableBalance), item.status, date(item.openedAt)])} />}
              {customer.cards?.length > 0 && <ProductDetail title="Credit cards" headers={["Card", "Product", "Credit limit", "Available", "Status", "Rewards", "Due date"]} rows={customer.cards.map((item: any) => [item.maskedNumber, item.product, money(item.creditLimit), money(item.availableCredit), item.status, item.rewardPoints, date(item.dueDate)])} />}
              {customer.loans?.length > 0 && <ProductDetail title="Loans" headers={["Loan", "Product", "Original amount", "Outstanding", "Rate", "Monthly payment", "Next due", "Status"]} rows={customer.loans.map((item: any) => [item.id, item.product, money(item.originalPrincipal), money(item.outstandingPrincipal), `${item.interestRate}%`, money(item.monthlyPayment), date(item.nextDueDate), item.status])} />}
              {customer.investments?.length > 0 && <ProductDetail title="Investments" headers={["Product", "Asset type", "Units", "Unit price", "Market value", "Cost basis", "Currency"]} rows={customer.investments.map((item: any) => [item.product, item.assetType, item.units, money(item.unitPrice), money(item.marketValue), money(item.costBasis), item.currency])} />}
              {customer.internetBanking && <ProductDetail title="Internet Banking" headers={["Username", "Status", "KYC", "Last login"]} rows={[[customer.internetBanking.username, customer.internetBanking.status, customer.internetBanking.kycStatus, date(customer.internetBanking.lastLoginAt)]]} />}
              {customer.mobileBanking && <ProductDetail title="Mobile Banking" headers={["Registration", "Status", "Device", "Device ID", "Last login", "Failed logins", "Locked"]} rows={[[customer.mobileBanking.registrationStatus, customer.mobileBanking.status, customer.mobileBanking.deviceName || "—", customer.mobileBanking.deviceId || "—", date(customer.mobileBanking.lastLogin), customer.mobileBanking.failedLoginCount, customer.mobileBanking.locked ? "Yes" : "No"]]} />}
              {customer.productApplications?.length > 0 && <ProductDetail title="Product applications" headers={["Category", "Product", "Status", "Reference", "Submitted"]} rows={customer.productApplications.map((item: any) => [item.productCategory, item.productName, item.status, item.reference, date(item.submittedAt)])} />}
              {!customer.accounts?.length && !customer.cards?.length && !customer.loans?.length && !customer.investments?.length && !customer.internetBanking && !customer.mobileBanking && <Empty text="This customer does not currently hold a banking product" />}
              <CustomerProductOpener customer={customer} busy={busy} createProduct={createProduct} />
            </div>
          ) : mode === "delete" && profile ? (
            <div className="deleteconfirmation">
              <AlertTriangle />
              <h3>Delete {profile.englishName}?</h3>
              <p>This permanently removes the customer and all linked banking products and transactions. Audit history remains available.</p>
              <div className="modalactions">
                <button type="button" onClick={close}>Cancel</button>
                <button type="button" className="danger" disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Confirm Delete"}</button>
              </div>
            </div>
          ) : (
            <ActionForm
              key={`${mode}-${customer?.id || "new"}`}
              testId={mode === "create" ? "submit-create-customer" : "submit-modify-customer"}
              label={busy ? "Saving…" : mode === "create" ? "Create Customer" : "Save Changes"}
              fields={fields}
              submit={mode === "create" ? create : modify}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function CustomerProductOpener({
  customer,
  busy,
  createProduct,
}: {
  customer: AnyRecord;
  busy: boolean;
  createProduct: (customerId: string, productType: string, values: AnyRecord) => Promise<AnyRecord | null>;
}) {
  const [openProduct, setOpenProduct] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const customerId = customer.customer?.id || customer.id;
  const products = [
    { id: "account", label: "Open deposit account", disabled: false },
    { id: "card", label: "Issue credit card", disabled: false },
    { id: "loan", label: "Open loan", disabled: false },
    { id: "investment", label: "Add investment", disabled: false },
    { id: "mobile", label: "Register Mobile Banking", disabled: Boolean(customer.mobileBanking) },
    { id: "internet-banking", label: "Create Internet Banking", disabled: Boolean(customer.internetBanking) },
  ];
  const formByProduct: Record<string, { title: string; fields: { name: string; label: string; type?: string; value?: string; options?: string[]; required?: boolean; min?: string; max?: string; step?: string }[] }> = {
    account: {
      title: "Open deposit account",
      fields: [
        { name: "type", label: "Account type", options: ["SAVINGS", "CURRENT", "FIXED_DEPOSIT"] },
        { name: "openingBalance", label: "Opening balance (THB)", type: "number", value: "1000", min: "0", step: "0.01" },
      ],
    },
    card: {
      title: "Issue credit card",
      fields: [
        { name: "product", label: "Card product", options: ["MFEC Platinum Visa", "MFEC Gold Mastercard", "MFEC Travel Card", "MFEC Cashback Card"] },
        { name: "creditLimit", label: "Credit limit (THB)", type: "number", value: "100000", min: "10000", max: "5000000", step: "1000" },
      ],
    },
    loan: {
      title: "Open loan",
      fields: [
        { name: "product", label: "Loan product", options: ["PERSONAL_LOAN", "HOME_LOAN", "SME_LOAN", "CARD_LOAN"] },
        { name: "originalPrincipal", label: "Principal (THB)", type: "number", value: "100000", min: "0.01", step: "0.01" },
        { name: "interestRate", label: "Annual interest rate (%)", type: "number", value: "7.5", min: "0", step: "0.001" },
        { name: "monthlyPayment", label: "Monthly payment (THB)", type: "number", value: "5000", min: "0.01", step: "0.01" },
      ],
    },
    investment: {
      title: "Add investment",
      fields: [
        { name: "product", label: "Investment product", value: "MFEC Balanced Fund" },
        { name: "assetType", label: "Asset type", options: ["MUTUAL_FUND", "BOND", "EQUITY", "FIXED_INCOME", "GOLD"] },
        { name: "units", label: "Units", type: "number", value: "100", min: "0.0001", step: "0.0001" },
        { name: "unitPrice", label: "Unit price (THB)", type: "number", value: "10", min: "0.0001", step: "0.0001" },
        { name: "costBasis", label: "Cost basis (THB)", type: "number", value: "1000", min: "0", step: "0.01" },
      ],
    },
    mobile: {
      title: "Register Mobile Banking",
      fields: [{ name: "deviceName", label: "Registered device name", value: "MFEC Mobile - Customer Device" }],
    },
  };
  const form = formByProduct[openProduct];
  return (
    <section className="customerproductopener" aria-labelledby="open-customer-product-heading">
      <h3 id="open-customer-product-heading">Add a product or service</h3>
      <p>Choose a service to open it for this customer. New products are saved to the customer profile and audit log.</p>
      <div className="customerproductbuttons">
        {products.map((product) => (
          <button
            type="button"
            key={product.id}
            className={openProduct === product.id ? "active" : ""}
            disabled={product.disabled || busy}
            aria-pressed={openProduct === product.id}
            onClick={() => {
              setGeneratedPassword("");
              setOpenProduct(openProduct === product.id ? "" : product.id);
            }}
          >
            {product.disabled ? `${product.label.replace("Create", "").replace("Register", "")} already active` : product.label}
          </button>
        ))}
      </div>
      {form && (
        <div className="customerproductform">
          <h4>{form.title}</h4>
          <ActionForm
            key={openProduct}
            label={busy ? "Saving…" : form.title}
            fields={form.fields}
            submit={async (values) => {
              const result = await createProduct(customerId, openProduct, values);
              if (result) {
                if (openProduct === "internet-banking") setGeneratedPassword(result.initialPassword || "");
                setOpenProduct("");
              }
            }}
          />
        </div>
      )}
      {openProduct === "internet-banking" && (
        <div className="customerproductform">
          <h4>Create Internet Banking</h4>
          <p>A secure temporary password will be generated and shown once after creation.</p>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const result = await createProduct(customerId, openProduct, {});
              if (result) {
                setGeneratedPassword(result.initialPassword || "");
                setOpenProduct("");
              }
            }}
          >
            {busy ? "Creating…" : "Create Internet Banking access"}
          </button>
        </div>
      )}
      {generatedPassword && (
        <div className="productcredential" role="status">
          <b>Temporary Internet Banking password (shown once)</b>
          <code>{generatedPassword}</code>
          <button type="button" onClick={() => setGeneratedPassword("")}>Hide password</button>
        </div>
      )}
    </section>
  );
}

function ProductDetail({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: any[][];
}) {
  return (
    <section className="productdetailgroup">
      <h4>{title}</h4>
      <Rows headers={headers} rows={rows} />
    </section>
  );
}

function DomainIcon({ domain }: { domain: string }) {
  const Icon =
    domain === "core"
      ? Landmark
      : domain === "card"
        ? CreditCard
        : domain === "loan" || domain === "collection"
          ? BriefcaseBusiness
          : domain === "internet-banking"
            ? LockKeyhole
            : domain === "wealth"
              ? WalletCards
              : domain === "fraud"
                ? AlertTriangle
                : domain === "kyc"
                  ? ShieldCheck
                  : domain === "notify"
                    ? Bell
                    : domain === "cif"
                      ? Users
                      : Activity;
  return <Icon />;
}
function Panel({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: any;
  wide?: boolean;
}) {
  return (
    <section className={`domainpanel${wide ? " wide" : ""}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Empty({ text = "No records for this customer" }: { text?: string }) {
  return <div className="empty">{text}</div>;
}
function Rows({ headers, rows }: { headers: string[]; rows: any[][] }) {
  return (
    <div className="domaintable">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ActionForm({
  fields,
  submit,
  label,
  testId,
}: {
  fields: {
    name: string;
    label: string;
    type?: string;
    value?: string;
    options?: string[];
    required?: boolean;
    min?: string;
    max?: string;
    step?: string;
  }[];
  submit: (values: AnyRecord) => void;
  label: string;
  testId?: string;
}) {
  const [values, setValues] = useState<AnyRecord>(
    Object.fromEntries(fields.map((f) => [f.name, f.value ?? f.options?.[0] ?? ""])),
  );
  return (
    <form
      className="actionform"
      onSubmit={(e) => {
        e.preventDefault();
        submit(values);
      }}
    >
      {fields.map((f) => (
        <label key={f.name}>
          {f.label}
          {f.options ? (
            <select
              data-testid={f.name}
              value={values[f.name]}
              onChange={(e) =>
                setValues({ ...values, [f.name]: e.target.value })
              }
            >
              {f.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              data-testid={f.name}
              type={f.type || "text"}
              required={f.required !== false}
              min={f.min}
              max={f.max}
              step={f.step}
              value={values[f.name]}
              onChange={(e) =>
                setValues({ ...values, [f.name]: e.target.value })
              }
            />
          )}
        </label>
      ))}
      <button data-testid={testId}>{label}</button>
    </form>
  );
}

function CreationTools({
  domain,
  data,
  extra,
  action,
  selectedAccountId,
  onAccountSelect,
  onAccountTransactionChange,
}: {
  domain: string;
  data: AnyRecord;
  extra: AnyRecord;
  action: (u: string, m: string, b?: AnyRecord) => Promise<any>;
  selectedAccountId: string;
  onAccountSelect: (id: string) => void;
  onAccountTransactionChange: () => void;
}) {
  const customer = data.customer,
    account = data.accounts[0],
    card = data.cards[0],
    payment = data.payments[0],
    credential = extra.internetBanking?.[0];
  const [accountTypeFilter, setAccountTypeFilter] = useState("ALL");
  const [accountStatusFilter, setAccountStatusFilter] = useState("ALL");
  const [accountSearchFilter, setAccountSearchFilter] = useState("");
  const [accountFrozenFilter, setAccountFrozenFilter] = useState("ALL");
  const accountTypes = [...new Set(data.accounts.map((a: AnyRecord) => a.type))] as string[];
  const accountStatuses = [...new Set(data.accounts.map((a: AnyRecord) => a.status))] as string[];
  const filteredAccounts = data.accounts.filter((a: AnyRecord) => {
    const query = accountSearchFilter.trim().toLowerCase();
    return (
      (accountTypeFilter === "ALL" || a.type === accountTypeFilter) &&
      (accountStatusFilter === "ALL" || a.status === accountStatusFilter) &&
      (accountFrozenFilter === "ALL" || String(Boolean(a.frozen)) === accountFrozenFilter) &&
      (!query || `${a.accountNumber || ""} ${a.type} ${a.status} ${a.id}`.toLowerCase().includes(query))
    );
  });
  const selectedAccount = domain === "core"
    ? filteredAccounts.find((a: AnyRecord) => a.id === selectedAccountId) || filteredAccounts[0]
    : data.accounts.find((a: AnyRecord) => a.id === selectedAccountId) || account;
  useEffect(() => {
    if (
      domain === "core" &&
      filteredAccounts.length > 0 &&
      !filteredAccounts.some((a: AnyRecord) => a.id === selectedAccountId)
    ) {
      onAccountSelect(filteredAccounts[0].id);
    }
  }, [domain, filteredAccounts, selectedAccountId, onAccountSelect]);
  if (domain === "cif")
    return (
      <Panel title="Create new synthetic customer" wide>
        <ActionForm
          testId="create-customer-button"
          label="Create customer"
          fields={[
            {
              name: "englishName",
              label: "English name",
              value: "Demo Customer",
            },
            { name: "thaiName", label: "Thai name", value: "ลูกค้าทดสอบ" },
            { name: "idNumber", label: "ID number", value: "XXXXXXXXXXX" },
            {
              name: "dateOfBirth",
              label: "Date of birth",
              type: "date",
              value: "1990-01-01",
            },
            { name: "mobile", label: "Test mobile", value: "080-TEST-0000" },
            {
              name: "email",
              label: "Test email",
              value: "demo.customer@example.invalid",
            },
            {
              name: "segment",
              label: "Segment",
              options: ["MASS", "AFFLUENT", "PLATINUM", "PRIVATE"],
            },
            {
              name: "risk",
              label: "Risk level",
              options: ["LOW", "MEDIUM", "HIGH"],
            },
            {
              name: "kycStatus",
              label: "Initial KYC",
              options: ["NOT_VERIFIED", "PARTIALLY_VERIFIED", "VERIFIED"],
            },
          ]}
          submit={(v) => action("/api/customers", "POST", v)}
        />
      </Panel>
    );
  if (domain === "core" || domain === "internet-banking")
    return (
      <div className="creationgrid">
        {domain === "core" && (
          <>
        <Panel title="Select account for administration">
          <div className="accountselectorfilters">
            <label>Account type<select aria-label="Filter accounts by type" data-testid="account-type-filter" value={accountTypeFilter} onChange={(event) => setAccountTypeFilter(event.target.value)}><option value="ALL">All types</option>{accountTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
            <label>Status<select aria-label="Filter accounts by status" data-testid="account-status-filter" value={accountStatusFilter} onChange={(event) => setAccountStatusFilter(event.target.value)}><option value="ALL">All statuses</option>{accountStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>Frozen<select aria-label="Filter accounts by frozen status" data-testid="account-frozen-filter" value={accountFrozenFilter} onChange={(event) => setAccountFrozenFilter(event.target.value)}><option value="ALL">Frozen or not frozen</option><option value="false">Not frozen</option><option value="true">Frozen</option></select></label>
            <label>Find account<input aria-label="Filter accounts by number or ID" data-testid="account-search-filter" value={accountSearchFilter} onChange={(event) => setAccountSearchFilter(event.target.value)} placeholder="Account number or ID" /></label>
          </div>
          <label className="recordselector">
            Account to manage
            <select data-testid="account-selector" value={filteredAccounts.some((a: AnyRecord) => a.id === selectedAccount?.id) ? selectedAccount?.id || "" : ""} onChange={(e) => onAccountSelect(e.target.value)}>
              {filteredAccounts.length ? filteredAccounts.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.type} · {a.accountNumber || "Unavailable"} · {a.status}{a.frozen ? " · FROZEN" : ""} · {money(a.availableBalance)}
                </option>
              )) : <option value="">No accounts match these filters</option>}
            </select>
          </label>
          {selectedAccount && <div className="selectedaccountcontext"><span>Selected account</span><b>{selectedAccount.accountNumber || "Unavailable"}</b><span>{selectedAccount.type.replaceAll("_", " ")} · {selectedAccount.status}{selectedAccount.frozen ? " · Frozen" : ""}</span></div>}
        </Panel>
        <Panel title="Open new deposit account">
          <ActionForm
            testId="open-account-button"
            label="Open account"
            fields={[
              {
                name: "type",
                label: "Account type",
                options: ["SAVINGS", "CURRENT", "FIXED_DEPOSIT"],
              },
              {
                name: "openingBalance",
                label: "Opening balance",
                type: "number",
                value: "1000",
              },
            ]}
            submit={(v) => {
              if (!window.confirm(`Confirm opening a ${v.type.replaceAll("_", " ")} account for ${customer.englishName} with an opening balance of ${money(v.openingBalance)}?`)) return;
              void action("/api/accounts", "POST", { ...v, customerId: customer.id });
            }}
          />
        </Panel>
        {selectedAccount && (
          <>
            <Panel title="Cash deposit">
              <div className="selectedaccountcontext"><span>Depositing to account</span><b>{selectedAccount.accountNumber || "Unavailable"}</b><span>{selectedAccount.type} · {selectedAccount.status}</span></div>
              <ActionForm
                label="Post deposit"
                fields={[
                  {
                    name: "amount",
                    label: "Amount",
                    type: "number",
                    value: "1000",
                  },
                  {
                    name: "description",
                    label: "Description",
                    value: "Branch cash deposit",
                  },
                ]}
                submit={async (v) => {
                  if (!window.confirm(`Confirm cash deposit of ${money(v.amount)} to account ${selectedAccount.accountNumber || "Unavailable"}?\n\nDescription: ${v.description}`)) return;
                  const result = await action(
                    `/api/accounts/${selectedAccount.id}/transactions`,
                    "POST",
                    { ...v, type: "DEPOSIT" },
                  );
                  if (result) onAccountTransactionChange();
                }}
              />
            </Panel>
            <Panel title="Cash withdrawal">
              <div className="selectedaccountcontext"><span>Withdrawing from account</span><b>{selectedAccount.accountNumber || "Unavailable"}</b><span>{selectedAccount.type} · {selectedAccount.status}</span></div>
              <ActionForm
                label="Post withdrawal"
                fields={[
                  {
                    name: "amount",
                    label: "Amount",
                    type: "number",
                    value: "500",
                  },
                  {
                    name: "description",
                    label: "Description",
                    value: "Branch cash withdrawal",
                  },
                ]}
                submit={async (v) => {
                  if (!window.confirm(`Confirm cash withdrawal of ${money(v.amount)} from account ${selectedAccount.accountNumber || "Unavailable"}?\n\nDescription: ${v.description}`)) return;
                  const result = await action(
                    `/api/accounts/${selectedAccount.id}/transactions`,
                    "POST",
                    { ...v, type: "WITHDRAWAL" },
                  );
                  if (result) onAccountTransactionChange();
                }}
              />
            </Panel>
            <Panel title="Account controls">
              <div className="selectedaccountcontext"><span>Account to update</span><b>{selectedAccount.accountNumber || "Unavailable"}</b><span>{selectedAccount.type} · {selectedAccount.status}{selectedAccount.frozen ? " · Frozen" : ""}</span></div>
              <div className="buttonstack">
                <button
                  onClick={() => {
                    const nextFrozen = !selectedAccount.frozen;
                    if (!window.confirm(`Confirm ${nextFrozen ? "freezing" : "unfreezing"} account ${selectedAccount.accountNumber || "Unavailable"}?`)) return;
                    void action(
                      `/api/accounts/${selectedAccount.id}/control`,
                      "PATCH",
                      { frozen: nextFrozen },
                    );
                  }}
                >
                  {selectedAccount.frozen ? "Unfreeze" : "Freeze"} account
                </button>
                <button
                  onClick={() => {
                    const nextStatus = selectedAccount.status === "ACTIVE" ? "DORMANT" : "ACTIVE";
                    if (!window.confirm(`Confirm changing account ${selectedAccount.accountNumber || "Unavailable"} status from ${selectedAccount.status} to ${nextStatus}?`)) return;
                    void action(
                      `/api/accounts/${selectedAccount.id}/control`,
                      "PATCH",
                      { status: nextStatus },
                    );
                  }}
                >
                  {selectedAccount.status === "ACTIVE"
                    ? "Mark dormant"
                    : "Reactivate"}
                </button>
              </div>
            </Panel>
          </>
        )}
          </>
        )}
        {domain === "internet-banking" && (
        <Panel title="Internet Banking access">
          {credential ? (
            <>
              <div className="credentialstatus">
                <span>
                  <b>{credential.username}</b>
                  <small>
                    Status: {credential.status} · Failed attempts:{" "}
                    {credential.failedAttempts}
                  </small>
                  <small>
                    KYC: {credential.kycStatus || "VERIFIED"}
                    {credential.registrationReference
                      ? ` · ${credential.registrationReference}`
                      : ""}
                  </small>
                </span>
                <strong className={`state ${credential.status}`}>
                  {credential.status}
                </strong>
              </div>
              <div className="buttonstack">
                <button
                  onClick={() =>
                    action(
                      `/api/internet-banking/${customer.id}/status`,
                      "PATCH",
                      {
                        status:
                          credential.status === "ACTIVE" ? "LOCKED" : "ACTIVE",
                      },
                    )
                  }
                >
                  {credential.status === "PENDING_APPROVAL"
                    ? "Approve"
                    : credential.status === "LOCKED"
                      ? "Unlock"
                      : credential.status === "REJECTED"
                        ? "Approve"
                        : "Lock"}{" "}
                  Internet Banking
                </button>
                {credential.status === "PENDING_APPROVAL" && (
                  <button
                    onClick={() =>
                      action(
                        `/api/internet-banking/${customer.id}/status`,
                        "PATCH",
                        {
                          status: "REJECTED",
                          reason: "KYC review rejected by administrator",
                        },
                      )
                    }
                  >
                    Reject request
                  </button>
                )}
              </div>
              <ActionForm
                label="Reset password"
                fields={[
                  {
                    name: "username",
                    label: "Username",
                    value: credential.username,
                  },
                  { name: "password", label: "New password", type: "password" },
                ]}
                submit={(v) =>
                  action("/api/internet-banking", "POST", {
                    ...v,
                    customerId: customer.id,
                  })
                }
              />
            </>
          ) : (
            <ActionForm
              testId="create-internet-banking-button"
              label="Create Internet Banking"
              fields={[
                {
                  name: "username",
                  label: "Username",
                  value: customer.id.toLowerCase().replaceAll("-", ""),
                },
                {
                  name: "password",
                  label: "Initial password",
                  type: "password",
                },
              ]}
              submit={(v) =>
                action("/api/internet-banking", "POST", {
                  ...v,
                  customerId: customer.id,
                })
              }
            />
          )}
          <hr />
          <h3>Automatic lockout policy</h3>
          <p className="disclaimer">
            Current threshold: {extra.settings?.maxFailedAttempts || 5} failed
            attempts
          </p>
          <ActionForm
            label="Update lockout threshold"
            fields={[
              {
                name: "maxFailedAttempts",
                label: "Failed attempts before lock (1–20)",
                type: "number",
                value: String(extra.settings?.maxFailedAttempts || 5),
              },
            ]}
            submit={(v) =>
              action("/api/internet-banking-settings", "PATCH", {
                maxFailedAttempts: Number(v.maxFailedAttempts),
              })
            }
          />
        </Panel>
        )}
      </div>
    );
  if (domain === "card") return null;
  if (domain === "loan")
    return (
      <Panel title="Book new synthetic loan" wide>
        <ActionForm
          testId="create-loan-button"
          label="Book loan"
          fields={[
            {
              name: "product",
              label: "Loan product",
              options: ["PERSONAL_LOAN", "HOME_LOAN", "SME_LOAN", "CARD_LOAN"],
            },
            {
              name: "originalPrincipal",
              label: "Principal",
              type: "number",
              value: "100000",
            },
            {
              name: "interestRate",
              label: "Annual interest rate (%)",
              type: "number",
              value: "7.5",
            },
            {
              name: "monthlyPayment",
              label: "Monthly payment",
              type: "number",
              value: "5000",
            },
          ]}
          submit={(v) =>
            action("/api/loans", "POST", { ...v, customerId: customer.id })
          }
        />
      </Panel>
    );
  if (domain === "mobile")
    return (
      <Panel title="Register or replace mobile device" wide>
        <ActionForm
          testId="register-device-button"
          label="Register device"
          fields={[
            {
              name: "deviceName",
              label: "Synthetic device name",
              value: "DemoHub24 iPhone",
            },
          ]}
          submit={(v) =>
            action("/api/mobile", "POST", { ...v, customerId: customer.id })
          }
        />
      </Panel>
    );
  if (domain === "payment" && payment)
    return (
      <Panel title="Payment lifecycle controls" wide>
        <div className="inlineactions lifecycle">
          <button
            onClick={() =>
              action(`/api/payments/${payment.id}/status`, "PATCH", {
                status: "PENDING",
              })
            }
          >
            Mark pending
          </button>
          <button
            onClick={() =>
              action(`/api/payments/${payment.id}/status`, "PATCH", {
                status: "FAILED",
                failureReason: "Destination unavailable",
              })
            }
          >
            Mark failed
          </button>
          <button
            onClick={() =>
              action(`/api/payments/${payment.id}/status`, "PATCH", {
                status: "REFUND_PENDING",
              })
            }
          >
            Start refund
          </button>
          <button
            onClick={() =>
              action(`/api/payments/${payment.id}/status`, "PATCH", {
                status: "REFUNDED",
              })
            }
          >
            Complete refund
          </button>
          <button
            onClick={() =>
              action(`/api/payments/${payment.id}/status`, "PATCH", {
                status: "SUCCESS",
              })
            }
          >
            Mark successful
          </button>
        </div>
      </Panel>
    );
  if (domain === "fraud")
    return (
      <Panel title="Create fraud alert" wide>
        <ActionForm
          testId="create-fraud-button"
          label="Create alert"
          fields={[
            {
              name: "fraudType",
              label: "Fraud type",
              options: [
                "CARD_NOT_PRESENT",
                "ACCOUNT_TAKEOVER",
                "SUSPICIOUS_TRANSFER",
                "IDENTITY_RISK",
              ],
            },
            {
              name: "riskScore",
              label: "Risk score (0–100)",
              type: "number",
              value: "75",
            },
            {
              name: "reasons",
              label: "Detection reason",
              value: "Manual demo investigation",
            },
          ]}
          submit={(v) =>
            action("/api/fraud-alerts", "POST", {
              ...v,
              customerId: customer.id,
            })
          }
        />
      </Panel>
    );
  if (domain === "campaign")
    return (
      <Panel title="Create customer offer" wide>
        <ActionForm
          testId="create-offer-button"
          label="Create offer"
          fields={[
            {
              name: "product",
              label: "Product offer",
              value: "MFEC Platinum Credit Card",
            },
            {
              name: "reason",
              label: "Eligibility reason",
              value: "High deposit relationship and marketing consent",
            },
            {
              name: "priority",
              label: "Priority (1–10)",
              type: "number",
              value: "1",
            },
          ]}
          submit={(v) =>
            action("/api/offers", "POST", { ...v, customerId: customer.id })
          }
        />
        <p className="disclaimer">
          DEMO RECOMMENDATION · NOT A PRODUCTION CREDIT DECISION
        </p>
      </Panel>
    );
  return null;
}

function CardWorkspace({
  data,
  action,
  busy,
}: {
  data: AnyRecord;
  action: (u: string, m: string, b?: AnyRecord) => Promise<any>;
  busy: boolean;
}) {
  const [selectedId, setSelectedId] = useState(data.cards[0]?.id || "");
  const card =
    data.cards.find((c: any) => c.id === selectedId) || data.cards[0];
  return (
    <div className="domainlayout">
      <Panel title="Card portfolio" wide>
        {data.cards.length ? (
          <>
            <label className="recordselector">
              Card to manage
              <select
                data-testid="card-selector"
                value={card?.id || ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {data.cards.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.product} · {c.maskedNumber} · {c.status}
                  </option>
                ))}
              </select>
            </label>
            <Rows
              headers={[
                "Masked card",
                "Product",
                "Status",
                "Limit",
                "Available",
                "Rewards",
                "Due date",
              ]}
              rows={data.cards.map((c: any) => [
                c.maskedNumber,
                c.product,
                <b className={`state ${c.status}`}>{c.status}</b>,
                money(c.creditLimit),
                money(c.availableCredit),
                c.rewardPoints,
                date(c.dueDate),
              ])}
            />
          </>
        ) : (
          <Empty />
        )}
      </Panel>
      <Panel title="Issue new synthetic card">
        <ActionForm
          testId="issue-card-button"
          label="Issue card"
          fields={[
            {
              name: "product",
              label: "Card product",
              options: [
                "MFEC Platinum Visa",
                "MFEC Gold Mastercard",
                "MFEC Travel Card",
                "MFEC Cashback Card",
              ],
            },
            {
              name: "creditLimit",
              label: "Credit limit (THB)",
              type: "number",
              value: "100000",
            },
          ]}
          submit={(v) =>
            action("/api/cards", "POST", { ...v, customerId: data.customer.id })
          }
        />
        <p className="disclaimer">
          Generates a non-usable masked demo identifier. No real PAN is created.
        </p>
      </Panel>
      {card && (
        <>
          <Panel title={`Manage ${card.product}`}>
            <SelectedCardSummary card={card} />
            <div className="buttonstack">
              <button
                data-testid="block-card-button"
                disabled={busy}
                onClick={() =>
                  action(`/api/cards/${card.id}/status`, "PATCH", {
                    status: "BLOCKED",
                    reason: "Suspected fraud",
                  })
                }
              >
                Block selected card
              </button>
              <button
                onClick={() =>
                  action(`/api/cards/${card.id}/status`, "PATCH", {
                    status: "ACTIVE",
                    reason: "Customer verified",
                  })
                }
              >
                Unblock selected card
              </button>
              <button
                onClick={() =>
                  action(`/api/cards/${card.id}/replacement`, "POST", {
                    reason: "Damaged card",
                  })
                }
              >
                Replace selected card
              </button>
              <button
                data-testid="charge-card-fee-button"
                disabled={busy}
                onClick={() => action(`/api/cards/${card.id}/card-fee`, "POST")}
              >
                Charge Card Fee · ฿5,000
              </button>
            </div>
          </Panel>
          <Panel title="Post purchase to selected card">
            <SelectedCardSummary card={card} />
            <ActionForm
              label="Post purchase"
              fields={[
                {
                  name: "merchant",
                  label: "Synthetic merchant",
                  value: "DEMO MART BANGKOK",
                },
                {
                  name: "amount",
                  label: "Amount",
                  type: "number",
                  value: "250",
                },
              ]}
              submit={(v) =>
                action(`/api/cards/${card.id}/transactions`, "POST", {
                  ...v,
                  type: "PURCHASE",
                })
              }
            />
          </Panel>
          <Panel title="Post refund to selected card">
            <SelectedCardSummary card={card} />
            <ActionForm
              label="Post refund"
              fields={[
                {
                  name: "merchant",
                  label: "Synthetic merchant",
                  value: "DEMO MART REFUND",
                },
                {
                  name: "amount",
                  label: "Amount",
                  type: "number",
                  value: "100",
                },
              ]}
              submit={(v) =>
                action(`/api/cards/${card.id}/transactions`, "POST", {
                  ...v,
                  type: "REFUND",
                })
              }
            />
          </Panel>
          <Panel title="Selected card transactions" wide>
            <SelectedCardSummary card={card} />
            {card.transactions?.length ? (
              <Rows
                headers={["Time", "Description", "Amount", "Status", "Action"]}
                rows={card.transactions.map((t: any) => [
                  date(t.occurredAt),
                  t.merchant,
                  money(t.amount),
                  t.status,
                  t.merchant === "CREDIT CARD FEE" && t.status === "POSTED" ? (
                    <button
                      type="button"
                      data-testid={`waive-card-fee-${t.id}`}
                      disabled={busy}
                      onClick={() =>
                        action(
                          `/api/cards/${card.id}/card-fee/${t.id}/waive`,
                          "POST",
                        )
                      }
                    >
                      Waive Card Fee
                    </button>
                  ) : "—",
                ])}
              />
            ) : (
              <Empty />
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function SelectedCardSummary({ card }: { card: AnyRecord }) {
  return (
    <div className="selectedrecord">
      <b>{card.maskedNumber}</b>
      <span>
        {card.product} · {card.status} · Available {money(card.availableCredit)}
      </span>
    </div>
  );
}

function MortgagePayoffCalculator({ loans }: { loans: AnyRecord[] }) {
  const [loanId, setLoanId] = useState(loans[0]?.id || "");
  const [payoffDate, setPayoffDate] = useState(
    new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  );
  const [quote, setQuote] = useState<AnyRecord | null>(null);
  const [error, setError] = useState("");
  const [calculating, setCalculating] = useState(false);
  const calculate = async () => {
    setCalculating(true);
    setError("");
    setQuote(null);
    try {
      const response = await fetch(`/api/loans/${loanId}/payoff-quote`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Correlation-ID": crypto.randomUUID(),
        },
        body: JSON.stringify({ payoffDate }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Unable to calculate payoff");
      setQuote(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to calculate payoff");
    } finally {
      setCalculating(false);
    }
  };
  return (
    <Panel title="Mortgage payoff calculator" wide>
      {loans.length ? (
        <div className="payoffcalculator">
          <div className="payoffinputs">
            <label>
              Loan to calculate
              <select value={loanId} onChange={(event) => { setLoanId(event.target.value); setQuote(null); }}>
                {loans.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.product} · {loan.id} · {money(loan.outstandingPrincipal)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Planned payoff date
              <input type="date" min={new Date().toISOString().slice(0, 10)} value={payoffDate} onChange={(event) => { setPayoffDate(event.target.value); setQuote(null); }} />
            </label>
            <button data-testid="calculate-payoff-button" disabled={calculating || !loanId || !payoffDate} onClick={calculate}>
              {calculating ? "Calculating…" : "Calculate Payoff Amount"}
            </button>
          </div>
          {error && <div className="flash">{error}</div>}
          {quote && (
            <div className="payoffquote" data-testid="payoff-quote">
              <div><span>Remaining principal</span><b>{money(quote.outstandingPrincipal)}</b></div>
              <div><span>Annual interest rate</span><b>{quote.annualInterestRate}%</b></div>
              <div><span>Days until payoff</span><b>{quote.daysUntilPayoff} days</b></div>
              <div><span>Accrued interest</span><b>{money(quote.accruedInterest)}</b></div>
              <div className="total"><span>Estimated payoff amount</span><b>{money(quote.payoffAmount)}</b></div>
              <small>Reference {quote.reference} · Calculated {quote.calculationDate} · Payoff {quote.payoffDate} · {quote.dayCountConvention}</small>
            </div>
          )}
          <p className="disclaimer">Estimate uses the current outstanding principal and simple daily interest under ACT/365. It does not post a payment or close the loan.</p>
        </div>
      ) : <Empty text="No loan is available for payoff calculation" />}
    </Panel>
  );
}

function DomainView({
  domain,
  data,
  extra,
  action,
  busy,
  accountTransactions = [],
  accountTransactionPage = 1,
  accountTransactionTotal = 0,
  accountTransactionsBusy = false,
  accountTransactionsError = "",
  onAccountTransactionPage = () => {},
  onAccountTransactionChange = () => {},
  selectedAccount,
}: {
  domain: string;
  data: AnyRecord;
  extra: AnyRecord;
  action: (u: string, m: string, b?: AnyRecord) => Promise<any>;
  busy: boolean;
  accountTransactions?: AnyRecord[];
  accountTransactionPage?: number;
  accountTransactionTotal?: number;
  accountTransactionsBusy?: boolean;
  accountTransactionsError?: string;
  onAccountTransactionPage?: (page: number) => void;
  onAccountTransactionChange?: () => void;
  selectedAccount?: AnyRecord;
}) {
  const customer = data.customer;
  if (domain === "cif")
    return (
      <div className="domainlayout">
        <Panel title="Customer master">
          <div className="profilegrid">
            <Fact k="Customer ID" v={customer.id} />
            <Fact k="CIF" v={customer.cif} />
            <Fact k="ID number" v={customer.idNumber} />
            <Fact k="Thai name" v={customer.thaiName} />
            <Fact k="English name" v={customer.englishName} />
            <Fact k="Synthetic ID" v={customer.syntheticId} />
            <Fact k="Date of birth" v={date(customer.dateOfBirth)} />
            <Fact k="Test mobile" v={customer.mobile} />
            <Fact k="Test email" v={customer.email} />
            <Fact k="Preferred language" v={customer.preferredLanguage} />
            <Fact k="Preferred channel" v={customer.preferredChannel} />
            <Fact k="Risk" v={customer.risk} />
            <Fact
              k="Marketing consent"
              v={customer.marketingConsent ? "YES" : "NO"}
            />
          </div>
        </Panel>
        <Panel title="Relationship summary">
          <Metric label="Accounts" value={data.accounts.length} />
          <Metric label="Cards" value={data.cards.length} />
          <Metric label="Loans" value={data.loans.length} />
          <Metric
            label="Relationship balance"
            value={money(
              data.accounts.reduce(
                (s: number, a: any) => s + Number(a.balance),
                0,
              ),
            )}
          />
        </Panel>
        <Panel title="Modify customer information" wide>
          <ActionForm
            key={customer.id}
            testId="update-customer-button"
            label={busy ? "Saving…" : "Save customer information"}
            fields={[
              { name: "englishName", label: "English name", value: customer.englishName },
              { name: "thaiName", label: "Thai name", value: customer.thaiName },
              { name: "idNumber", label: "ID number", value: customer.idNumber || "XXXXXXXXXXX" },
              { name: "dateOfBirth", label: "Date of birth", type: "date", value: new Date(customer.dateOfBirth).toISOString().slice(0, 10) },
              { name: "mobile", label: "Test mobile", value: customer.mobile },
              { name: "email", label: "Test email", value: customer.email },
              { name: "segment", label: "Segment", value: customer.segment, options: ["MASS", "AFFLUENT", "PLATINUM", "PRIVATE"] },
              { name: "risk", label: "Risk level", value: customer.risk, options: ["LOW", "MEDIUM", "HIGH"] },
              { name: "preferredLanguage", label: "Preferred language", value: customer.preferredLanguage, options: ["TH", "EN"] },
              { name: "preferredChannel", label: "Preferred channel", value: customer.preferredChannel, options: ["VOICE", "MOBILE", "EMAIL", "SMS"] },
            ]}
            submit={(values) => action(`/api/customers/${customer.id}/profile`, "PATCH", values)}
          />
        </Panel>
      </div>
    );
  if (domain === "core")
    return (
      <div className="domainlayout">
        <Panel title="Deposit accounts" wide>
          {data.accounts.length ? (
            <Rows
              headers={[
                "Account number",
                "Type",
                "Balance",
                "Available",
                "Status",
                "Frozen",
              ]}
              rows={data.accounts.map((a: any) => [
                a.accountNumber || "Unavailable",
                a.type,
                money(a.balance),
                money(a.availableBalance),
                a.status,
                a.frozen ? "YES" : "NO",
              ])}
            />
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel title="Create domestic transfer">
          {selectedAccount && <div className="selectedaccountcontext"><span>Transferring from selected account</span><b>{selectedAccount.accountNumber || "Unavailable"}</b><span>{selectedAccount.type} · {selectedAccount.status}{selectedAccount.frozen ? " · Frozen" : ""}</span></div>}
          {selectedAccount ? <ActionForm
            label="Submit transfer"
            fields={[
              { name: "destination", label: "Destination / PromptPay", value: "TEST-DEST-001" },
              { name: "amount", label: "Amount (THB)", type: "number", value: "1000" },
              { name: "channel", label: "Channel", options: ["INTERNET_BANKING", "BRANCH", "CONTACT_CENTER"] },
            ]}
            submit={async (v) => {
              if (!window.confirm(`Confirm domestic transfer of ${money(v.amount)} from account ${selectedAccount.accountNumber || "Unavailable"} to ${v.destination}?\n\nChannel: ${v.channel}`)) return;
      await action("/api/operations/transfer", "POST", {
                ...v,
                sourceAccountId: selectedAccount.id,
                customerId: customer.id,
              });
              onAccountTransactionChange();
            }}
          /> : <Empty text="Select an account before creating a transfer" />}
        </Panel>
        <Panel title="Account transactions">
          {accountTransactionsError ? (
            <div className="flash">{accountTransactionsError}</div>
          ) : accountTransactionsBusy ? (
            <div className="empty">Loading account transactions…</div>
          ) : accountTransactions.length ? (
            <>
              <Rows
                headers={["Time", "Type", "Description", "Amount"]}
                rows={accountTransactions.map((transaction: any) => [
                  date(transaction.occurredAt),
                  transaction.type,
                  transaction.description,
                  money(transaction.amount),
                ])}
              />
              <nav className="resultpagination" aria-label="Account transaction pages">
                <button
                  type="button"
                  disabled={accountTransactionPage <= 1 || accountTransactionsBusy}
                  onClick={() => onAccountTransactionPage(accountTransactionPage - 1)}
                >
                  Previous
                </button>
                <span>
                  Page <b>{accountTransactionPage}</b> of{" "}
                  <b>{Math.max(1, Math.ceil(accountTransactionTotal / 20))}</b>
                  {" · "}{accountTransactionTotal} transactions · 20 per page
                </span>
                <button
                  type="button"
                  disabled={accountTransactionPage >= Math.ceil(accountTransactionTotal / 20) || accountTransactionsBusy}
                  onClick={() => onAccountTransactionPage(accountTransactionPage + 1)}
                >
                  Next
                </button>
              </nav>
            </>
          ) : (
            <Empty text="No transactions for this account" />
          )}
        </Panel>
      </div>
    );
  if (domain === "card")
    return <CardWorkspace data={data} action={action} busy={busy} />;
  if (domain === "loan")
    return (
      <div className="domainlayout">
        <Panel title="Loan accounts" wide>
          {data.loans.length ? (
            <Rows
              headers={[
                "Loan",
                "Product",
                "Original",
                "Outstanding",
                "Rate",
                "Installment",
                "DPD",
                "Status",
              ]}
              rows={data.loans.map((l: any) => [
                l.id,
                l.product,
                money(l.originalPrincipal),
                money(l.outstandingPrincipal),
                `${l.interestRate}%`,
                money(l.monthlyPayment),
                l.daysPastDue,
                l.status,
              ])}
            />
          ) : (
            <Empty />
          )}
        </Panel>
        <MortgagePayoffCalculator loans={data.loans} />
        {data.loans[0] && (
          <Panel title="Post loan payment">
            <ActionForm
              label="Post payment"
              fields={[
                {
                  name: "amount",
                  label: "Payment amount",
                  type: "number",
                  value: String(data.loans[0].monthlyPayment),
                },
              ]}
              submit={(v) =>
                action(`/api/loans/${data.loans[0].id}/payment`, "POST", v)
              }
            />
          </Panel>
        )}
        <Panel title="Repayment status">
          <Metric label="Next due" value={date(data.loans[0]?.nextDueDate)} />
          <Metric
            label="Collection stage"
            value={data.loans[0]?.collectionStage || "CURRENT"}
          />
        </Panel>
      </div>
    );
  if (domain === "collection")
    return (
      <div className="domainlayout legacywork">
        <Panel title="Collection portfolio" wide>
          {data.loans.length ? (
            <Rows
              headers={[
                "Borrower",
                "Loan",
                "Outstanding",
                "DPD",
                "Stage",
                "PTP count",
              ]}
              rows={data.loans.map((l: any) => [
                customer.englishName,
                l.id,
                money(l.outstandingPrincipal),
                l.daysPastDue,
                l.collectionStage || "CURRENT",
                l.promises.length,
              ])}
            />
          ) : (
            <Empty />
          )}
        </Panel>
        {data.loans[0] && (
          <Panel title="Create promise to pay">
            <ActionForm
              testId="save-ptp-button"
              label="Save promise to pay"
              fields={[
                {
                  name: "amount",
                  label: "Promise amount",
                  type: "number",
                  value: "15000",
                },
                { name: "promiseDate", label: "Promise date", type: "date" },
              ]}
              submit={(v) =>
                action(
                  `/legacy/loans/${data.loans[0].id}/promise-to-pay`,
                  "POST",
                  v,
                )
              }
            />
          </Panel>
        )}
        <Panel title="PTP history">
          {data.loans.flatMap((l: any) => l.promises).length ? (
            <Rows
              headers={["Reference", "Amount", "Promise date", "Status"]}
              rows={data.loans
                .flatMap((l: any) => l.promises)
                .map((p: any) => [
                  p.reference,
                  money(p.amount),
                  date(p.promiseDate),
                  p.status,
                ])}
            />
          ) : (
            <Empty />
          )}
        </Panel>
      </div>
    );
  if (domain === "mobile")
    return (
      <div className="domainlayout legacywork">
        <Panel title="Registered mobile device">
          <div className="profilegrid">
            <Fact k="Status" v={data.mobileBanking?.status} />
            <Fact
              k="Device ID"
              v={data.mobileBanking?.deviceId || "Not registered"}
            />
            <Fact k="Device name" v={data.mobileBanking?.deviceName || "—"} />
            <Fact k="Registration" v={data.mobileBanking?.registrationStatus} />
            <Fact k="Last login" v={date(data.mobileBanking?.lastLogin)} />
            <Fact
              k="Failed attempts"
              v={data.mobileBanking?.failedLoginCount}
            />
          </div>
        </Panel>
        <Panel title="Device administration">
          <div className="buttonstack">
            <button
              data-testid="reset-registration-button"
              onClick={() =>
                action(`/legacy/mobile/${customer.id}/reset`, "POST")
              }
            >
              Reset device registration
            </button>
            <button
              onClick={() =>
                action(`/api/mobile/${customer.id}/status`, "PATCH", {
                  status: "ACTIVE",
                })
              }
            >
              Activate access
            </button>
            <button
              onClick={() =>
                action(`/api/mobile/${customer.id}/status`, "PATCH", {
                  status: "LOCKED",
                })
              }
            >
              Lock access
            </button>
            <button
              onClick={() =>
                action(`/api/mobile/${customer.id}/status`, "PATCH", {
                  status: "PASSWORD_RESET_REQUIRED",
                })
              }
            >
              Require password reset
            </button>
          </div>
        </Panel>
      </div>
    );
  if (domain === "payment")
    return (
      <div className="domainlayout">
        <Panel title="Payment and transfer investigation" wide>
          {data.payments.length ? (
            <Rows
              headers={[
                "Reference",
                "Created",
                "Source",
                "Destination",
                "Amount",
                "Channel",
                "Status",
                "Failure / refund",
              ]}
              rows={data.payments.map((p: any) => [
                p.reference,
                date(p.createdAt),
                p.sourceAccount,
                p.destination,
                money(p.amount),
                p.channel,
                <b className={`state ${p.status}`}>{p.status}</b>,
                p.failureReason || p.refundStatus || "—",
              ])}
            />
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel title="Create simulated payment">
          <ActionForm
            label="Execute payment"
            fields={[
              {
                name: "sourceAccountId",
                label: "Source account",
                value: data.accounts[0]?.id,
              },
              {
                name: "destination",
                label: "Destination / PromptPay",
                value: "081-TEST-0001",
              },
              { name: "amount", label: "Amount", type: "number", value: "500" },
              {
                name: "channel",
                label: "Payment type",
                options: [
                  "PROMPTPAY",
                  "DOMESTIC_TRANSFER",
                  "BILL_PAYMENT",
                  "INTERNATIONAL_SIMULATION",
                ],
              },
            ]}
            submit={(v) =>
              action("/api/operations/transfer", "POST", {
                ...v,
                customerId: customer.id,
              })
            }
          />
        </Panel>
      </div>
    );
  if (domain === "wealth")
    return (
      <div className="domainlayout">
        <Panel title="Investment portfolio" wide>
          {data.investments.length ? (
            <Rows
              headers={[
                "Product",
                "Asset type",
                "Units",
                "Unit price",
                "Market value",
                "Cost",
                "Gain / loss",
              ]}
              rows={data.investments.map((i: any) => [
                i.product,
                i.assetType,
                String(i.units),
                money(i.unitPrice),
                money(i.marketValue),
                money(i.costBasis),
                money(Number(i.marketValue) - Number(i.costBasis)),
              ])}
            />
          ) : (
            <Empty text="No holdings yet—add a synthetic investment below." />
          )}
        </Panel>
        <Panel title="Add synthetic holding">
          <ActionForm
            label="Add to portfolio"
            fields={[
              {
                name: "product",
                label: "Product",
                value: "MFEC Thai Equity Fund",
              },
              {
                name: "assetType",
                label: "Asset type",
                options: ["MUTUAL_FUND", "BOND", "STRUCTURED_PRODUCT"],
              },
              { name: "units", label: "Units", type: "number", value: "100" },
              {
                name: "unitPrice",
                label: "Unit price",
                type: "number",
                value: "12.50",
              },
              {
                name: "costBasis",
                label: "Cost basis",
                type: "number",
                value: "1200",
              },
            ]}
            submit={(v) =>
              action("/api/investments", "POST", {
                ...v,
                customerId: customer.id,
              })
            }
          />
          <p className="disclaimer">
            Informational synthetic values only. Not financial advice.
          </p>
        </Panel>
      </div>
    );
  if (domain === "fraud")
    return (
      <div className="domainlayout">
        <Panel title="Fraud alert queue" wide>
          {data.fraudAlerts.length ? (
            <Rows
              headers={[
                "Alert",
                "Type",
                "Score",
                "Reasons",
                "Status",
                "Investigation",
              ]}
              rows={data.fraudAlerts.map((a: any) => [
                a.id,
                a.fraudType,
                a.riskScore,
                a.reasons.join(", "),
                a.status,
                a.investigationStatus,
              ])}
            />
          ) : (
            <Empty />
          )}
        </Panel>
        {data.fraudAlerts[0] && (
          <Panel title="Investigation action">
            <div className="buttonstack">
              <button
                onClick={() =>
                  action(
                    `/api/fraud-alerts/${data.fraudAlerts[0].id}`,
                    "PATCH",
                    {
                      status: "CONFIRMED",
                      investigationStatus: "ESCALATED",
                      notes: "Escalated from fraud console",
                    },
                  )
                }
              >
                Confirm and escalate
              </button>
              <button
                onClick={() =>
                  action(
                    `/api/fraud-alerts/${data.fraudAlerts[0].id}`,
                    "PATCH",
                    {
                      status: "CLOSED",
                      investigationStatus: "FALSE_POSITIVE",
                      notes: "Customer verified transaction",
                    },
                  )
                }
              >
                Close as false positive
              </button>
            </div>
          </Panel>
        )}
      </div>
    );
  if (domain === "kyc")
    return (
      <div className="domainlayout">
        <Panel title="Identity verification">
          <div className="identity">
            <BadgeCheck />
            <div>
              <b>{customer.kycStatus}</b>
              <span>Risk rating: {customer.risk}</span>
              <span>Synthetic ID: {customer.syntheticId}</span>
              <span>Last updated: {date(customer.updatedAt)}</span>
            </div>
          </div>
        </Panel>
        <Panel title="KYC decision">
          <div className="buttonstack">
            <button
              onClick={() =>
                action(`/api/customers/${customer.id}/kyc`, "PATCH", {
                  status: "VERIFIED",
                })
              }
            >
              Mark verified
            </button>
            <button
              onClick={() =>
                action(`/api/customers/${customer.id}/kyc`, "PATCH", {
                  status: "PARTIALLY_VERIFIED",
                })
              }
            >
              Partial verification
            </button>
            <button
              onClick={() =>
                action(`/api/customers/${customer.id}/kyc`, "PATCH", {
                  status: "FAILED",
                })
              }
            >
              Fail verification
            </button>
            <button
              onClick={() =>
                action(`/api/customers/${customer.id}/kyc`, "PATCH", {
                  status: "EXPIRED",
                })
              }
            >
              Expire KYC
            </button>
          </div>
        </Panel>
      </div>
    );
  if (domain === "campaign")
    return (
      <div className="domainlayout">
        <Panel title="Next best offers" wide>
          <div className="recommendation">
            DEMO RECOMMENDATION · NOT A PRODUCTION CREDIT DECISION
          </div>
          {data.offers.length ? (
            <Rows
              headers={[
                "Offer",
                "Product",
                "Reason",
                "Priority",
                "Status",
                "Action",
              ]}
              rows={data.offers.map((o: any) => [
                o.id,
                o.product,
                o.reason,
                o.priority,
                o.status,
                <span className="inlineactions">
                  <button
                    onClick={() =>
                      action(`/api/offers/${o.id}`, "PATCH", {
                        status: "ACCEPTED",
                      })
                    }
                  >
                    Accept
                  </button>
                  <button
                    onClick={() =>
                      action(`/api/offers/${o.id}`, "PATCH", {
                        status: "DECLINED",
                      })
                    }
                  >
                    Decline
                  </button>
                </span>,
              ])}
            />
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel title="Genesys outbound">
          <button onClick={() => downloadOffers(data.offers, customer)}>
            Export campaign CSV
          </button>
          <p className="disclaimer">
            Exports synthetic campaign-member data only.
          </p>
        </Panel>
      </div>
    );
  if (domain === "notify")
    return (
      <div className="domainlayout">
        <Panel title="Notification simulator">
          <ActionForm
            label="Simulate notification"
            fields={[
              {
                name: "channel",
                label: "Channel",
                options: ["SMS", "EMAIL", "PUSH", "MESSAGING"],
              },
              { name: "template", label: "Template", value: "PAYMENT_STATUS" },
              {
                name: "message",
                label: "Synthetic message",
                value: "Your DemoHub24 transaction status has been updated.",
              },
            ]}
            submit={(v) =>
              action("/api/notifications", "POST", {
                ...v,
                customerId: customer.id,
              })
            }
          />
          <p className="disclaimer">
            Simulation only. No external message is sent.
          </p>
        </Panel>
        <Panel title="Notification history" wide>
          {extra.notifications?.length ? (
            <Rows
              headers={["Created", "Channel", "Template", "Message", "Status"]}
              rows={extra.notifications.map((n: any) => [
                date(n.createdAt),
                n.channel,
                n.template,
                n.message,
                n.status,
              ])}
            />
          ) : (
            <Empty />
          )}
        </Panel>
      </div>
    );
  if (domain === "admin")
    return (
      <div className="domainlayout">
        <Panel title="Lab operations">
          <div className="adminmetrics">
            {Object.entries(extra.summary || {}).map(([k, v]) => (
              <Metric key={k} label={k} value={String(v ?? "—")} />
            ))}
          </div>
          <button onClick={() => location.reload()}>
            <RefreshCw /> Refresh health
          </button>
        </Panel>
        <Panel title="Product application approvals" wide>
          {extra.productApplications?.length ? (
            <Rows
              headers={[
                "Submitted",
                "Reference",
                "Customer",
                "Applicant",
                "Product",
                "Status",
                "Provisioned",
                "Decision",
              ]}
              rows={extra.productApplications.map((application: any) => [
                date(application.submittedAt),
                application.reference,
                `${application.customer?.englishName} · ${application.customer?.cif}`,
                application.applicantType.replaceAll("_", " "),
                application.productName,
                <b className={`state ${application.status}`}>{application.status}</b>,
                application.provisionedResourceId || "—",
                application.status === "PENDING_APPROVAL" ? (
                  <div className="inlineactions">
                    <button
                      onClick={() =>
                        action(
                          `/api/product-applications/${application.id}/decision`,
                          "PATCH",
                          { decision: "APPROVED", reason: "Approved by product administrator" },
                        )
                      }
                    >
                      Approve &amp; add product
                    </button>
                    <button
                      onClick={() =>
                        action(
                          `/api/product-applications/${application.id}/decision`,
                          "PATCH",
                          { decision: "REJECTED", reason: "Application did not meet review requirements" },
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  application.decisionReason || "Reviewed"
                ),
              ])}
            />
          ) : (
            <Empty text="No product applications have been submitted." />
          )}
        </Panel>
        <Panel title="Audit explorer" wide>
          {extra.audit?.length ? (
            <Rows
              headers={[
                "Timestamp",
                "Actor",
                "Source",
                "Action",
                "Customer",
                "Result",
                "Correlation",
              ]}
              rows={extra.audit
                .slice(0, 30)
                .map((a: any) => [
                  date(a.timestamp),
                  a.actor,
                  a.sourceSystem,
                  a.action,
                  a.customerId || "—",
                  a.result,
                  a.correlationId || "—",
                ])}
            />
          ) : (
            <Empty />
          )}
        </Panel>
      </div>
    );
  return <Empty text="This banking module is being configured." />;
}
function Fact({ k, v }: { k: string; v: any }) {
  return (
    <div className="fact">
      <span>{k}</span>
      <b>{String(v ?? "—")}</b>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div className="domainmetric">
      <span>{label.replace(/([A-Z])/g, " $1")}</span>
      <b>{value}</b>
    </div>
  );
}
function downloadOffers(offers: any[], customer: any) {
  const rows = [
    ["customer_id", "name", "mobile", "product", "priority", "status"],
    ...offers.map((o) => [
      customer.id,
      customer.englishName,
      customer.mobile,
      o.product,
      o.priority,
      o.status,
    ]),
  ];
  const blob = new Blob(
    [
      rows
        .map((r) =>
          r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
        )
        .join("\n"),
    ],
    { type: "text/csv" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `demohub24-campaign-${customer.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
