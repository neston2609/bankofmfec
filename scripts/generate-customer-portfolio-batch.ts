import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const db = new PrismaClient();
const BATCH = 'MFEC100-20260902';
const COUNT = 100;
const outputArg = process.argv.indexOf('--output');
const outputPath = resolve(outputArg >= 0 ? process.argv[outputArg + 1] : `tmp/${BATCH}.json`);

const thaiFirst = ['กิตติ', 'ชลธิชา', 'ณัฐพงษ์', 'พิมพ์ชนก', 'ธนกร', 'ศิริพร', 'วรพล', 'ชนากานต์', 'ภัทร', 'อรอนงค์', 'นรินทร์', 'สุภาวดี', 'ปกรณ์', 'ธัญญารัตน์', 'วิศรุต', 'กมลชนก', 'รัชพล', 'อัญชลี', 'ธีรภัทร', 'พรทิพย์'];
const thaiLast = ['วัฒนกุล', 'ศรีสุข', 'เจริญทรัพย์', 'ตั้งมั่น', 'พัฒนกิจ', 'รุ่งเรือง', 'สินสมบูรณ์', 'วงศ์สวัสดิ์', 'ธรรมรักษ์', 'เกียรติไพบูลย์'];
const englishFirst = ['Kitti', 'Chonthicha', 'Nattapong', 'Pimchanok', 'Thanakorn', 'Siriporn', 'Worapol', 'Chanakan', 'Phat', 'Onanong', 'Narin', 'Supawadee', 'Pakorn', 'Thanyarat', 'Wisarut', 'Kamonchanok', 'Ratchapon', 'Anchalee', 'Teerapat', 'Porntip'];
const englishLast = ['Wattanakul', 'Srisuk', 'Charoensap', 'Tangman', 'Pattanakit', 'Rungruang', 'Sinsomboon', 'Wongsawat', 'Thammarak', 'Kiatpaiboon'];
const segments = ['MASS', 'AFFLUENT', 'PLATINUM', 'PRIVATE'] as const;
const risks = ['LOW', 'LOW', 'MEDIUM', 'MEDIUM', 'HIGH'] as const;
const accountTypes = ['SAVINGS', 'CURRENT', 'FIXED_DEPOSIT'];
const cardProducts = ['MFEC Classic Visa', 'MFEC Platinum Visa', 'MFEC Travel Mastercard', 'MFEC Cashback Platinum'];
const loanProducts = ['Personal Loan', 'Home Loan', 'Auto Loan', 'SME Term Loan'];
const investmentProducts = [
  ['MFEC Money Market Fund', 'MUTUAL_FUND'],
  ['MFEC Thai Equity Fund', 'MUTUAL_FUND'],
  ['MFEC Global Technology Fund', 'MUTUAL_FUND'],
  ['Thai Government Bond 2031', 'BOND'],
] as const;

function pad(value: number, width = 3) {
  return String(value).padStart(width, '0');
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function isoDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

async function main() {
  const existing = await db.customer.count({ where: { id: { startsWith: `CUST-${BATCH}-` } } });
  if (existing > 0) {
    throw new Error(`Batch ${BATCH} already exists with ${existing} customers; no records were changed.`);
  }

  const exportCustomers: any[] = [];
  const exportHoldings: any[] = [];
  const exportCredentials: any[] = [];

  for (let i = 1; i <= COUNT; i += 1) {
    const seq = pad(i);
    const customerId = `CUST-${BATCH}-${seq}`;
    const firstIndex = (i - 1) % thaiFirst.length;
    const lastIndex = Math.floor((i - 1) / thaiFirst.length) % thaiLast.length;
    const thaiName = `${thaiFirst[firstIndex]} ${thaiLast[lastIndex]}`;
    const englishName = `${englishFirst[firstIndex]} ${englishLast[lastIndex]}`;
    const segment = segments[(i - 1) % segments.length];
    const risk = risks[(i - 1) % risks.length];
    const dob = isoDate(1968 + ((i * 7) % 35), ((i * 5) % 12) + 1, ((i * 11) % 27) + 1);
    const mobile = `089${String(1000000 + i).slice(-7)}`;
    const email = `customer.${seq}@demo.mfecbank.invalid`;
    const accountCount = 1 + (i % 3);
    const hasCard = i % 4 !== 0;
    const hasLoan = i % 3 === 0 || i % 7 === 0;
    const hasInvestment = i % 2 === 0 || i % 5 === 0;
    const hasMobile = i % 5 !== 0;
    const hasInternetBanking = i <= 70;
    const createdAt = isoDate(2024 + (i % 3), ((i * 3) % 12) + 1, ((i * 7) % 27) + 1);
    const customerHoldings: any[] = [];

    await db.$transaction(async (tx) => {
      await tx.customer.create({
        data: {
          id: customerId,
          cif: `CIF-${BATCH}-${seq}`,
          syntheticId: `TEST-NID-${BATCH}-${seq}`,
          thaiName,
          englishName,
          dateOfBirth: dob,
          mobile,
          email,
          segment,
          preferredLanguage: i % 4 === 0 ? 'EN' : 'TH',
          preferredChannel: i % 3 === 0 ? 'EMAIL' : i % 3 === 1 ? 'MOBILE' : 'VOICE',
          vip: segment === 'PRIVATE',
          risk,
          marketingConsent: i % 6 !== 0,
          kycStatus: 'VERIFIED',
          createdAt,
        },
      });

      for (let a = 1; a <= accountCount; a += 1) {
        const accountId = `ACC-${BATCH}-${seq}-${a}`;
        const type = accountTypes[(i + a - 2) % accountTypes.length];
        const balance = 25000 + i * 4375 + a * 12500;
        const maskedNumber = `xxx-x-${pad(i, 4)}-${pad(a, 2)}`;
        await tx.account.create({
          data: {
            id: accountId,
            customerId,
            type,
            maskedNumber,
            balance,
            availableBalance: balance,
            status: 'ACTIVE',
            frozen: false,
            openedAt: createdAt,
            transactions: {
              create: {
                id: `ATX-${BATCH}-${seq}-${a}-OPEN`,
                type: 'CREDIT',
                description: 'Synthetic demo opening balance',
                amount: balance,
                occurredAt: createdAt,
              },
            },
          },
        });
        customerHoldings.push({ customerId, holdingType: 'DEPOSIT_ACCOUNT', resourceId: accountId, product: type, status: 'ACTIVE', balanceOrValue: balance, currency: 'THB', detail: maskedNumber });
      }

      if (hasCard) {
        const cardId = `CARD-${BATCH}-${seq}`;
        const product = cardProducts[(i - 1) % cardProducts.length];
        const creditLimit = 30000 + ((i - 1) % 8) * 20000;
        const used = (i % 6) * 1350;
        await tx.card.create({
          data: {
            id: cardId,
            customerId,
            maskedNumber: `**** **** **** ${String(4100 + i).padStart(4, '0')}`,
            product,
            status: 'ACTIVE',
            creditLimit,
            availableCredit: creditLimit - used,
            rewardPoints: i * 137,
            dueDate: isoDate(2026, ((i + 1) % 12) + 1, 25),
          },
        });
        customerHoldings.push({ customerId, holdingType: 'CREDIT_CARD', resourceId: cardId, product, status: 'ACTIVE', balanceOrValue: creditLimit, currency: 'THB', detail: `Limit ${creditLimit}` });
      }

      if (hasLoan) {
        const loanId = `LOAN-${BATCH}-${seq}`;
        const product = loanProducts[(i - 1) % loanProducts.length];
        const principal = product === 'Home Loan' ? 2500000 + i * 25000 : product === 'Auto Loan' ? 650000 + i * 5000 : 150000 + i * 2500;
        const outstanding = Math.round(principal * (0.55 + (i % 4) * 0.08));
        const rate = product === 'Home Loan' ? 4.75 : product === 'Auto Loan' ? 3.25 : 8.5;
        await tx.loan.create({
          data: {
            id: loanId,
            customerId,
            product,
            originalPrincipal: principal,
            outstandingPrincipal: outstanding,
            interestRate: rate,
            monthlyPayment: Math.round(principal / 60),
            nextDueDate: isoDate(2026, ((i + 2) % 12) + 1, 15),
            daysPastDue: 0,
            status: 'CURRENT',
          },
        });
        customerHoldings.push({ customerId, holdingType: 'LOAN', resourceId: loanId, product, status: 'CURRENT', balanceOrValue: outstanding, currency: 'THB', detail: `Original principal ${principal}` });
      }

      if (hasInvestment) {
        const investmentId = `INV-${BATCH}-${seq}`;
        const [product, assetType] = investmentProducts[(i - 1) % investmentProducts.length];
        const units = 500 + i * 17.25;
        const unitPrice = 9.5 + (i % 11) * 1.15;
        const marketValue = Math.round(units * unitPrice * 100) / 100;
        await tx.investment.create({
          data: {
            id: investmentId,
            customerId,
            product,
            assetType,
            units,
            unitPrice,
            marketValue,
            costBasis: Math.round(marketValue * 0.94 * 100) / 100,
            currency: 'THB',
          },
        });
        customerHoldings.push({ customerId, holdingType: 'INVESTMENT', resourceId: investmentId, product, status: 'ACTIVE', balanceOrValue: marketValue, currency: 'THB', detail: `${units.toFixed(4)} units` });
      }

      if (hasMobile) {
        const mobileId = `MB-${BATCH}-${seq}`;
        await tx.mobileBanking.create({
          data: {
            id: mobileId,
            customerId,
            status: 'ACTIVE',
            deviceId: `DEMO-DEVICE-${seq}`,
            deviceName: i % 2 === 0 ? 'iPhone Demo' : 'Android Demo',
            lastLogin: isoDate(2026, 8, (i % 27) + 1),
            registrationStatus: 'REGISTERED',
          },
        });
        customerHoldings.push({ customerId, holdingType: 'MOBILE_BANKING', resourceId: mobileId, product: 'MFEC Mobile Banking', status: 'ACTIVE', balanceOrValue: null, currency: null, detail: 'Registered demo device' });
      }

      if (hasInternetBanking) {
        const username = `mfecdemo${pad(i)}`;
        const password = `MFEC@Demo${pad(i)}!`;
        const credentialId = `IBC-${BATCH}-${seq}`;
        await tx.bankingCredential.create({
          data: {
            id: credentialId,
            customerId,
            username,
            passwordHash: hashPassword(password),
            status: 'ACTIVE',
            kycStatus: 'VERIFIED',
            registrationReference: `IBREG-${BATCH}-${seq}`,
            requestedAt: createdAt,
            approvedAt: createdAt,
            approvedBy: 'batch.admin',
          },
        });
        exportCredentials.push({ customerId, cif: `CIF-${BATCH}-${seq}`, englishName, username, password, status: 'ACTIVE', kycStatus: 'VERIFIED', approvedBy: 'batch.admin', approvedAt: createdAt.toISOString() });
        customerHoldings.push({ customerId, holdingType: 'INTERNET_BANKING', resourceId: credentialId, product: 'MFEC Internet Banking', status: 'ACTIVE', balanceOrValue: null, currency: null, detail: username });
      }

      await tx.auditLog.create({
        data: {
          actor: 'batch.admin',
          sourceSystem: 'CUSTOMER_BATCH_GENERATOR',
          action: 'CREATE_SYNTHETIC_CUSTOMER_PORTFOLIO',
          customerId,
          resource: `Customer/${customerId}`,
          newValue: { batch: BATCH, accountCount, hasCard, hasLoan, hasInvestment, hasMobile, hasInternetBanking },
          correlationId: BATCH,
          result: 'SUCCESS',
        },
      });
    });

    exportHoldings.push(...customerHoldings);
    exportCustomers.push({
      customerId,
      cif: `CIF-${BATCH}-${seq}`,
      syntheticId: `TEST-NID-${BATCH}-${seq}`,
      thaiName,
      englishName,
      dateOfBirth: dob.toISOString(),
      mobile,
      email,
      segment,
      risk,
      kycStatus: 'VERIFIED',
      preferredLanguage: i % 4 === 0 ? 'EN' : 'TH',
      preferredChannel: i % 3 === 0 ? 'EMAIL' : i % 3 === 1 ? 'MOBILE' : 'VOICE',
      vip: segment === 'PRIVATE',
      marketingConsent: i % 6 !== 0,
      createdAt: createdAt.toISOString(),
      accountCount,
      hasCard,
      hasLoan,
      hasInvestment,
      hasMobileBanking: hasMobile,
      hasInternetBanking,
      totalProducts: customerHoldings.length,
      portfolio: customerHoldings.map((h) => h.product).join(' | '),
    });
  }

  const payload = {
    metadata: {
      batch: BATCH,
      generatedAt: new Date().toISOString(),
      customerCount: exportCustomers.length,
      holdingCount: exportHoldings.length,
      internetBankingCount: exportCredentials.length,
      note: 'Synthetic demonstration data only. Credentials are for the DemoHub24 mock banking environment.',
    },
    customers: exportCustomers,
    holdings: exportHoldings,
    internetBanking: exportCredentials,
  };
  await mkdir(resolve(outputPath, '..'), { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(JSON.stringify({ batch: BATCH, customers: exportCustomers.length, holdings: exportHoldings.length, internetBanking: exportCredentials.length, exportPath: outputPath }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
