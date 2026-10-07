import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  Headers,
  Patch,
  Post,
  Body,
  NotFoundException,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { BankService } from "./service";
import type { Request, Response } from "express";
import {
  createHmac,
  timingSafeEqual,
  scryptSync,
  randomBytes,
} from "node:crypto";
@Controller()
export class AppController {
  constructor(private db: BankService) {}
  private ctx(h: any) {
    return {
      correlationId: h["x-correlation-id"],
      genesysConversationId: h["x-genesys-conversation-id"],
      serviceNowCaseId: h["x-servicenow-case-id"],
      googleAiSessionId: h["x-google-ai-session-id"],
      uiPathJobId: h["x-uipath-job-id"],
    };
  }
  private sign(value: string) {
    return createHmac("sha256", process.env.JWT_SECRET || "")
      .update(value)
      .digest("base64url");
  }
  private session(req: Request) {
    const token = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("demohub_session="))
      ?.slice(16);
    if (!token) return false;
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;
    const expected = this.sign(payload);
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      return false;
    try {
      const [, expiry] = Buffer.from(payload, "base64url")
        .toString()
        .split("|");
      return Number(expiry) > Date.now();
    } catch {
      return false;
    }
  }
  private passwordHash(
    password: string,
    salt = randomBytes(16).toString("hex"),
  ) {
    return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  }
  private passwordValid(password: string, stored: string) {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const supplied = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return (
      supplied.length === expected.length && timingSafeEqual(supplied, expected)
    );
  }
  private retailCustomer(req: Request) {
    const token = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("mfecbank_session="))
      ?.slice(17);
    if (!token) return null;
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    const expected = this.sign(`retail:${payload}`);
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      return null;
    try {
      const [customerId, expiry] = Buffer.from(payload, "base64url")
        .toString()
        .split("|");
      return Number(expiry) > Date.now() ? customerId : null;
    } catch {
      return null;
    }
  }
  private async requireRetail(req: Request) {
    const customerId = this.retailCustomer(req);
    if (!customerId)
      throw new UnauthorizedException("Internet Banking login is required");
    const credential = await this.db.bankingCredential.findUnique({
      where: { customerId },
      select: { status: true },
    });
    if (!credential || credential.status !== "ACTIVE")
      throw new UnauthorizedException("Internet Banking access is locked");
    return customerId;
  }
  @Post("auth/login") login(
    @Body() body: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const expected = process.env.ADMIN_INITIAL_PASSWORD || "";
    const supplied = String(body.password || "");
    const valid =
      body.username === "admin" &&
      supplied.length === expected.length &&
      timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
    if (!valid) throw new UnauthorizedException("Invalid username or password");
    const expiry = Date.now() + 8 * 60 * 60 * 1000;
    const payload = Buffer.from(`admin|${expiry}`).toString("base64url");
    res.cookie("demohub_session", `${payload}.${this.sign(payload)}`, {
      domain: ".demohub24.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    });
    return {
      status: "ok",
      user: { username: "admin", role: "ADMIN" },
      expiresAt: new Date(expiry).toISOString(),
    };
  }
  @Get("auth/verify") verify(@Req() req: Request, @Res() res: Response) {
    return this.session(req) ? res.status(204).send() : res.status(401).send();
  }
  @Post("auth/logout") logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("demohub_session", {
      domain: ".demohub24.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
    return { status: "ok" };
  }
  @Get("retail/products") retailProducts(): any[] {
    return [
      {
        category: "DEPOSIT",
        code: "SAVINGS_PLUS",
        name: "MFEC Savings Plus",
        tagline: "Everyday savings with flexible access",
        rate: "Up to 1.50% p.a.",
        features: [
          "No minimum ongoing balance",
          "Mobile and Internet Banking",
          "Free internal transfers",
        ],
      },
      {
        category: "DEPOSIT",
        code: "FIXED_12M",
        name: "MFEC 12-Month Fixed Deposit",
        tagline: "Predictable returns for planned savings",
        rate: "2.25% p.a.",
        features: [
          "Fixed 12-month term",
          "Monthly interest option",
          "Deposit protection simulation",
        ],
      },
      {
        category: "CARD",
        code: "PLATINUM_VISA",
        name: "MFEC Platinum Visa",
        tagline: "Premium rewards for everyday spending",
        rate: "Annual fee waived in demo",
        features: [
          "2× demo reward points",
          "Travel benefits simulation",
          "Fraud monitoring",
        ],
      },
      {
        category: "CARD",
        code: "CASHBACK",
        name: "MFEC Cashback Card",
        tagline: "Cashback on synthetic purchases",
        rate: "Up to 3% demo cashback",
        features: [
          "Dining and online categories",
          "Real-time transaction history",
          "Card controls",
        ],
      },
      {
        category: "CARD",
        code: "TRAVEL",
        name: "MFEC Travel Card",
        tagline: "Designed for international simulations",
        rate: "0% FX markup simulation",
        features: [
          "Travel notices",
          "Emergency replacement",
          "Airport benefit simulation",
        ],
      },
      {
        category: "LOAN",
        code: "PERSONAL",
        name: "MFEC Personal Loan",
        tagline: "Flexible funding for personal plans",
        rate: "From 8.50% p.a.",
        features: [
          "Fixed monthly installment",
          "12–60 month simulation",
          "No collateral",
        ],
      },
      {
        category: "LOAN",
        code: "HOME",
        name: "MFEC Home Loan",
        tagline: "Make the next home possible",
        rate: "From 3.25% p.a. introductory",
        features: [
          "Up to 30-year simulation",
          "Flexible repayment",
          "Refinance scenario",
        ],
      },
      {
        category: "INVESTMENT",
        code: "BALANCED_FUND",
        name: "MFEC Balanced Fund",
        tagline: "Diversified synthetic portfolio",
        rate: "Risk level 5",
        features: [
          "Equity and bond allocation",
          "Daily valuation simulation",
          "Suitability required",
        ],
      },
      {
        category: "INVESTMENT",
        code: "THAI_EQUITY",
        name: "MFEC Thai Equity Fund",
        tagline: "Synthetic exposure to Thai equities",
        rate: "Risk level 6",
        features: [
          "Long-term growth objective",
          "Daily NAV simulation",
          "No guaranteed return",
        ],
      },
    ];
  }
  @Post("retail/auth/register") async retailRegister(
    @Body() b: any,
    @Headers() h: any,
  ) {
    const username = String(b.username || "")
        .trim()
        .toLowerCase(),
      password = String(b.password || ""),
      identifier = String(b.customerIdentifier || "").trim(),
      syntheticId = String(b.syntheticId || "").trim(),
      mobile = String(b.mobile || "").trim(),
      birth = String(b.dateOfBirth || "");
    if (
      identifier.length < 4 ||
      syntheticId.length < 8 ||
      mobile.length < 6 ||
      username.length < 4 ||
      password.length < 8 ||
      !birth
    )
      throw new BadRequestException(
        "Customer/CIF, synthetic ID, date of birth, test mobile, username and password are required",
      );
    const customer = await this.db.customer.findFirst({
      where: { OR: [{ id: identifier }, { cif: identifier }] },
    });
    const identityMatches =
      customer &&
      customer.syntheticId === syntheticId &&
      customer.mobile === mobile &&
      customer.dateOfBirth.toISOString().slice(0, 10) === birth;
    if (!identityMatches)
      throw new UnauthorizedException(
        "Identity verification failed. Check the details held in CIF.",
      );
    if (
      await this.db.bankingCredential.findFirst({
        where: { OR: [{ customerId: customer.id }, { username }] },
      })
    )
      throw new BadRequestException(
        "An Internet Banking registration already exists for this customer or username",
      );
    const stamp = Date.now(),
      reference = `IBREG-${stamp}`;
    const credential = await this.db.bankingCredential.create({
      data: {
        id: `IBC-${stamp}`,
        customerId: customer.id,
        username,
        passwordHash: this.passwordHash(password),
        status: "PENDING_APPROVAL",
        kycStatus: "VERIFIED",
        registrationReference: reference,
        requestedAt: new Date(),
        failedAttempts: 0,
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: username,
        sourceSystem: "INTERNET_BANKING",
        action: "REQUEST_INTERNET_BANKING",
        customerId: customer.id,
        resource: `BankingCredential/${credential.id}`,
        newValue: {
          reference,
          username,
          status: credential.status,
          kycStatus: credential.kycStatus,
        },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return {
      reference,
      registrationReference: reference,
      status: credential.status,
      kycStatus: credential.kycStatus,
      message:
        "Identity verified. Your request is waiting for administrator approval.",
    };
  }
  @Get("retail/auth/registration/:reference") async retailRegistrationStatus(
    @Param("reference") reference: string,
  ) {
    const request = await this.db.bankingCredential.findUnique({
      where: { registrationReference: reference },
      select: {
        registrationReference: true,
        status: true,
        kycStatus: true,
        requestedAt: true,
        approvedAt: true,
        rejectedAt: true,
        rejectionReason: true,
      },
    });
    if (!request)
      throw new NotFoundException("Registration request was not found");
    return request;
  }
  @Post("retail/auth/login") async retailLogin(
    @Body() b: any,
    @Res({ passthrough: true }) res: Response,
    @Headers() h: any,
  ) {
    const username = String(b.username || "")
        .trim()
        .toLowerCase(),
      password = String(b.password || "");
    const credential = await this.db.bankingCredential.findUnique({
      where: { username },
    });
    if (credential && credential.status !== "ACTIVE") {
      const message =
        credential.status === "LOCKED"
          ? "Internet Banking access is locked"
          : credential.status === "PENDING_APPROVAL"
            ? "Registration is waiting for administrator approval"
            : credential.status === "REJECTED"
              ? "Internet Banking registration was rejected"
              : "Internet Banking access is unavailable";
      throw new UnauthorizedException(message);
    }
    if (!credential || !this.passwordValid(password, credential.passwordHash)) {
      if (credential) {
        const state = await this.db.labState.findUnique({
          where: { id: "singleton" },
          select: { internetBankingMaxFailedAttempts: true },
        });
        const configured =
          state?.internetBankingMaxFailedAttempts ||
          Number(process.env.IB_MAX_FAILED_ATTEMPTS) ||
          5;
        const maxAttempts = Math.max(1, Math.min(20, configured));
        const attempts = credential.failedAttempts + 1;
        const locked = attempts >= maxAttempts;
        await this.db.bankingCredential.update({
          where: { id: credential.id },
          data: {
            failedAttempts: attempts,
            status: locked ? "LOCKED" : "ACTIVE",
            lockedAt: locked ? new Date() : null,
          },
        });
        if (locked) {
          const alertId = `FRAUD-IB-${Date.now()}`;
          await this.db.$transaction([
            this.db.fraudAlert.create({
              data: {
                id: alertId,
                customerId: credential.customerId,
                fraudType: "INTERNET_BANKING_LOGIN_FAILURE",
                riskScore: 90,
                reasons: [
                  "FAILED_LOGIN_THRESHOLD_REACHED",
                  `FAILED_ATTEMPTS_${attempts}`,
                ],
                status: "OPEN",
                investigationStatus: "REVIEW_REQUIRED",
                notes: `Internet Banking was automatically locked after ${attempts} failed login attempts.`,
              },
            }),
            this.db.auditLog.create({
              data: {
                actor: username,
                sourceSystem: "INTERNET_BANKING",
                action: "AUTOMATIC_LOGIN_LOCK_AND_FRAUD_ALERT",
                customerId: credential.customerId,
                resource: `BankingCredential/${credential.id}`,
                newValue: { failedAttempts: attempts, maxAttempts, alertId },
                result: "SUCCESS",
                ...this.ctx(h),
              },
            }),
          ]);
        }
      }
      throw new UnauthorizedException("Invalid username or password");
    }
    const expiry = Date.now() + 2 * 60 * 60 * 1000;
    const payload = Buffer.from(`${credential.customerId}|${expiry}`).toString(
      "base64url",
    );
    res.cookie(
      "mfecbank_session",
      `${payload}.${this.sign(`retail:${payload}`)}`,
      {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 2 * 60 * 60 * 1000,
      },
    );
    await this.db.bankingCredential.update({
      where: { id: credential.id },
      data: { failedAttempts: 0, lastLoginAt: new Date() },
    });
    await this.db.auditLog.create({
      data: {
        actor: username,
        sourceSystem: "INTERNET_BANKING",
        action: "CUSTOMER_LOGIN",
        customerId: credential.customerId,
        resource: `BankingCredential/${credential.id}`,
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return { status: "ok", expiresAt: new Date(expiry).toISOString() };
  }
  @Get("retail/auth/session") async retailSession(@Req() req: Request) {
    const customerId = await this.requireRetail(req);
    const credential = await this.db.bankingCredential.findUniqueOrThrow({
      where: { customerId },
      select: { username: true, status: true, lastLoginAt: true },
    });
    const customer = await this.db.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: {
        id: true,
        cif: true,
        englishName: true,
        thaiName: true,
        segment: true,
      },
    });
    return { authenticated: true, customer, credential };
  }
  @Post("retail/auth/logout") retailLogout(
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie("mfecbank_session", {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
    return { status: "ok" };
  }
  @Get("retail/dashboard") async retailDashboard(@Req() req: Request) {
    const customerId = await this.requireRetail(req);
    const banking = await this.db.c360(customerId);
    if (!banking) throw new NotFoundException();
    const applications = await this.db.productApplication.findMany({
      where: { customerId },
      orderBy: { submittedAt: "desc" },
    });
    return { ...banking, productApplications: applications };
  }
  @Get("retail/accounts/lookup") async retailAccountLookup(
    @Req() req: Request,
    @Query("number") number = "",
  ) {
    await this.requireRetail(req);
    const query = String(number).trim();
    if (query.length < 4)
      throw new BadRequestException(
        "Enter an exact account ID or masked account number",
      );
    const account = await this.db.account.findFirst({
      where: { OR: [{ id: query }, { maskedNumber: query }] },
      select: {
        id: true,
        maskedNumber: true,
        type: true,
        status: true,
        frozen: true,
        customer: { select: { englishName: true } },
      },
    });
    if (!account)
      throw new NotFoundException("Destination account was not found");
    if (account.status !== "ACTIVE" || account.frozen)
      throw new BadRequestException("Destination account is not available");
    return {
      id: account.id,
      maskedNumber: account.maskedNumber,
      type: account.type,
      accountName: account.customer.englishName,
    };
  }
  @Post("retail/transfers") async retailTransfer(
    @Req() req: Request,
    @Body() b: any,
    @Headers() h: any,
  ) {
    const customerId = await this.requireRetail(req),
      amount = Number(b.amount);
    if (
      !b.sourceAccountId ||
      !b.destination ||
      !Number.isFinite(amount) ||
      amount <= 0
    )
      throw new BadRequestException(
        "Source account, destination and positive amount are required",
      );
    return this.db.$transaction(async (tx) => {
      const source = await tx.account.findUniqueOrThrow({
        where: { id: b.sourceAccountId },
      });
      if (source.customerId !== customerId)
        throw new UnauthorizedException(
          "Source account is not owned by this customer",
        );
      if (source.status !== "ACTIVE" || source.frozen)
        throw new BadRequestException("Source account is not available");
      if (Number(source.availableBalance) < amount)
        throw new BadRequestException("Insufficient available balance");
      const stamp = Date.now(),
        reference = `IB-${stamp}`;
      const account = await tx.account.update({
        where: { id: source.id },
        data: {
          balance: { decrement: amount },
          availableBalance: { decrement: amount },
        },
      });
      const debit = await tx.accountTransaction.create({
        data: {
          id: `IBTX-${stamp}`,
          accountId: source.id,
          type: "DEBIT",
          description: `Internet Banking transfer to ${b.destination}`,
          amount: -amount,
          occurredAt: new Date(),
        },
      });
      const destination = await tx.account.findFirst({
        where: {
          OR: [
            { id: String(b.destination) },
            { maskedNumber: String(b.destination) },
          ],
        },
      });
      let credit = null;
      if (destination && destination.id !== source.id) {
        await tx.account.update({
          where: { id: destination.id },
          data: {
            balance: { increment: amount },
            availableBalance: { increment: amount },
          },
        });
        credit = await tx.accountTransaction.create({
          data: {
            id: `IBTX-${stamp}-CR`,
            accountId: destination.id,
            type: "CREDIT",
            description: `Internet Banking transfer from ${source.maskedNumber}`,
            amount,
            occurredAt: new Date(),
          },
        });
      }
      const payment = await tx.payment.create({
        data: {
          id: `IBPAY-${stamp}`,
          customerId,
          sourceAccount: source.maskedNumber,
          destination: String(b.destination),
          amount,
          channel: b.channel || "INTERNET_BANKING",
          status: "SUCCESS",
          reference,
        },
      });
      await tx.auditLog.create({
        data: {
          actor: "CUSTOMER",
          sourceSystem: "INTERNET_BANKING",
          action: "CUSTOMER_TRANSFER",
          customerId,
          resource: `Payment/${payment.id}`,
          newValue: { reference, amount, destination: b.destination },
          result: "SUCCESS",
          ...this.ctx(h),
        },
      });
      return { reference, account, debit, credit, payment };
    });
  }
  @Post("retail/product-applications") async applyProduct(
    @Req() req: Request,
    @Body() b: any,
    @Headers() h: any,
  ) {
    const products = this.retailProducts();
    const product = products.find((x) => x.code === b.productCode);
    if (!product) throw new BadRequestException("Unknown product");
    const signedInCustomerId = this.retailCustomer(req);
    let customerId = signedInCustomerId ? await this.requireRetail(req) : null;
    let applicantType = "EXISTING_CUSTOMER";
    let customerCreated = false;
    if (!customerId) {
      const englishName = String(b.englishName || "").trim();
      const thaiName = String(b.thaiName || englishName).trim();
      const syntheticId = String(b.syntheticId || "").trim();
      const idNumber = String(b.idNumber || "XXXXXXXXXXX").trim();
      const dateOfBirth = String(b.dateOfBirth || "");
      const mobile = String(b.mobile || "").trim();
      const email = String(b.email || "").trim().toLowerCase();
      if (
        englishName.length < 3 ||
        syntheticId.length < 8 ||
        !dateOfBirth ||
        mobile.length < 6 ||
        !email.includes("@")
      )
        throw new BadRequestException(
          "Name, synthetic ID, date of birth, mobile and email are required",
        );
      const birth = new Date(dateOfBirth);
      if (Number.isNaN(birth.getTime()) || birth >= new Date())
        throw new BadRequestException("A valid past date of birth is required");
      const existing = await this.db.customer.findFirst({
        where: {
          OR: [
            { syntheticId },
            { email: { equals: email, mode: "insensitive" } },
            { mobile },
            { englishName: { equals: englishName, mode: "insensitive" } },
            { thaiName: { equals: thaiName, mode: "insensitive" } },
          ],
        },
      });
      if (existing) {
        const matches =
          existing.syntheticId === syntheticId &&
          existing.mobile === mobile &&
          existing.email.toLowerCase() === email &&
          existing.dateOfBirth.toISOString().slice(0, 10) === dateOfBirth;
        if (!matches)
          throw new UnauthorizedException(
            "Customer information could not be verified against the existing bank record",
          );
        customerId = existing.id;
      } else {
        const stamp = Date.now();
        const customer = await this.db.customer.create({
          data: {
            id: `CUST-${stamp}`,
            cif: `CIF-${stamp}`,
            syntheticId,
            idNumber: idNumber || "XXXXXXXXXXX",
            thaiName,
            englishName,
            dateOfBirth: birth,
            mobile,
            email,
            segment: "MASS",
            preferredLanguage: "TH",
            preferredChannel: "WEB",
            vip: false,
            risk: "LOW",
            marketingConsent: b.marketingConsent === true,
            kycStatus: "NOT_VERIFIED",
          },
        });
        customerId = customer.id;
        applicantType = "NEW_CUSTOMER";
        customerCreated = true;
      }
    }
    const stamp = Date.now(),
      reference = `APP-${stamp}`;
    const application = await this.db.productApplication.create({
      data: {
        id: `PAPP-${stamp}`,
        customerId: customerId!,
        productCategory: product.category,
        productCode: product.code,
        productName: product.name,
        status: "PENDING_APPROVAL",
        reference,
        applicantType,
        applicantSnapshot: signedInCustomerId
          ? { channel: "AUTHENTICATED_INTERNET_BANKING" }
          : {
              channel: "PUBLIC_WEB",
              englishName: String(b.englishName),
              thaiName: String(b.thaiName || b.englishName),
              syntheticId: String(b.syntheticId),
              dateOfBirth: String(b.dateOfBirth),
              mobile: String(b.mobile),
              email: String(b.email).toLowerCase(),
            },
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: signedInCustomerId ? "CUSTOMER" : "PUBLIC_APPLICANT",
        sourceSystem: signedInCustomerId ? "INTERNET_BANKING" : "PUBLIC_WEB",
        action: "APPLY_PRODUCT",
        customerId,
        resource: `ProductApplication/${application.id}`,
        newValue: {
          reference,
          productCode: product.code,
          productName: product.name,
          applicantType,
          customerCreated,
          status: application.status,
        },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return {
      reference,
      status: application.status,
      customerId,
      customerCreated,
      applicantType,
      message: "Application submitted and waiting for administrator approval.",
    };
  }
  @Get("retail/product-applications/:reference") async productApplicationStatus(
    @Param("reference") reference: string,
  ) {
    const application = await this.db.productApplication.findUnique({
      where: { reference },
      select: {
        reference: true,
        productName: true,
        status: true,
        applicantType: true,
        submittedAt: true,
        reviewedAt: true,
        decisionReason: true,
        provisionedResourceId: true,
      },
    });
    if (!application) throw new NotFoundException("Application was not found");
    return application;
  }
  @Get("api/product-applications") productApplications(
    @Query("status") status?: string,
  ) {
    return this.db.productApplication.findMany({
      where: status ? { status } : {},
      include: {
        customer: {
          select: {
            id: true,
            cif: true,
            englishName: true,
            thaiName: true,
            mobile: true,
            email: true,
            kycStatus: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 200,
    });
  }
  @Patch("api/product-applications/:id/decision") async decideProductApplication(
    @Param("id") id: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    if (!["APPROVED", "REJECTED"].includes(b.decision))
      throw new BadRequestException("Decision must be APPROVED or REJECTED");
    return this.db.$transaction(async (tx) => {
      const application = await tx.productApplication.findUniqueOrThrow({
        where: { id },
      });
      if (application.status !== "PENDING_APPROVAL")
        throw new BadRequestException("This application has already been reviewed");
      const stamp = Date.now();
      let provisionedResourceId: string | null = null;
      if (b.decision === "APPROVED") {
        if (application.productCategory === "DEPOSIT") {
          const type = application.productCode === "FIXED_12M" ? "FIXED_DEPOSIT" : "SAVINGS";
          const account = await tx.account.create({
            data: {
              id: `ACC-${stamp}`,
              customerId: application.customerId,
              type,
              maskedNumber: `XXX-X-TEST-${String(stamp).slice(-4)}`,
              balance: 0,
              availableBalance: 0,
              status: "ACTIVE",
              frozen: false,
              openedAt: new Date(),
            },
          });
          provisionedResourceId = account.id;
        } else if (application.productCategory === "CARD") {
          const card = await tx.card.create({
            data: {
              id: `CARD-${stamp}`,
              customerId: application.customerId,
              maskedNumber: `4599-TEST-XXXX-${String(stamp).slice(-4)}`,
              product: application.productName,
              status: "ACTIVE",
              creditLimit: 100000,
              availableCredit: 100000,
              rewardPoints: 0,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
          provisionedResourceId = card.id;
        } else if (application.productCategory === "LOAN") {
          const home = application.productCode === "HOME";
          const loan = await tx.loan.create({
            data: {
              id: `LOAN-${stamp}`,
              customerId: application.customerId,
              product: home ? "HOME_LOAN" : "PERSONAL_LOAN",
              originalPrincipal: home ? 3000000 : 100000,
              outstandingPrincipal: home ? 3000000 : 100000,
              interestRate: home ? 3.25 : 8.5,
              monthlyPayment: home ? 15000 : 5000,
              nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              daysPastDue: 0,
              status: "ACTIVE",
              collectionStage: null,
            },
          });
          provisionedResourceId = loan.id;
        } else if (application.productCategory === "INVESTMENT") {
          const investment = await tx.investment.create({
            data: {
              id: `INV-${stamp}`,
              customerId: application.customerId,
              product: application.productName,
              assetType: "MUTUAL_FUND",
              units: 1,
              unitPrice: 100,
              marketValue: 100,
              costBasis: 100,
              currency: "THB",
            },
          });
          provisionedResourceId = investment.id;
        }
      }
      const reviewed = await tx.productApplication.update({
        where: { id },
        data: {
          status: b.decision,
          reviewedAt: new Date(),
          reviewedBy: "ADMIN",
          decisionReason: String(b.reason || (b.decision === "APPROVED" ? "Application approved" : "Application rejected")),
          provisionedResourceId,
        },
      });
      await tx.auditLog.create({
        data: {
          actor: "ADMIN",
          sourceSystem: "ADMIN_PORTAL",
          action: `${b.decision}_PRODUCT_APPLICATION`,
          customerId: application.customerId,
          resource: `ProductApplication/${id}`,
          previousValue: { status: application.status },
          newValue: {
            status: reviewed.status,
            productCode: application.productCode,
            provisionedResourceId,
            reason: reviewed.decisionReason,
          },
          result: "SUCCESS",
          ...this.ctx(h),
        },
      });
      return { reference: application.reference, application: reviewed, provisionedResourceId };
    });
  }
  @Get("api/internet-banking") internetBanking(
    @Query("customerId") customerId?: string,
  ) {
    return this.db.bankingCredential.findMany({
      where: customerId ? { customerId } : {},
      select: {
        id: true,
        customerId: true,
        username: true,
        status: true,
        kycStatus: true,
        registrationReference: true,
        requestedAt: true,
        approvedAt: true,
        approvedBy: true,
        rejectedAt: true,
        rejectionReason: true,
        failedAttempts: true,
        lockedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  }
  @Get("api/internet-banking-settings") async internetBankingSettings() {
    const state = await this.db.labState.findUnique({
      where: { id: "singleton" },
      select: { internetBankingMaxFailedAttempts: true },
    });
    return { maxFailedAttempts: state?.internetBankingMaxFailedAttempts || 5 };
  }
  @Patch("api/internet-banking-settings") async updateInternetBankingSettings(
    @Body() b: any,
    @Headers() h: any,
  ) {
    const value = Number(b.maxFailedAttempts);
    if (!Number.isInteger(value) || value < 1 || value > 20)
      throw new BadRequestException(
        "Maximum failed attempts must be an integer from 1 to 20",
      );
    const old = await this.db.labState.findUnique({
      where: { id: "singleton" },
    });
    const state = await this.db.labState.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        seedVersion: process.env.SEED_VERSION || "DEMOHUB24-BANK-2026-V1",
        internetBankingMaxFailedAttempts: value,
      },
      update: { internetBankingMaxFailedAttempts: value },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "CORE_BANKING",
        action: "UPDATE_LOGIN_LOCKOUT_POLICY",
        resource: "LabState/singleton",
        previousValue: {
          maxFailedAttempts: old?.internetBankingMaxFailedAttempts || 5,
        },
        newValue: { maxFailedAttempts: value },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return { maxFailedAttempts: state.internetBankingMaxFailedAttempts };
  }
  @Post("api/internet-banking") async createInternetBanking(
    @Body() b: any,
    @Headers() h: any,
  ) {
    const username = String(b.username || "")
        .trim()
        .toLowerCase(),
      password = String(b.password || "");
    if (!b.customerId || username.length < 4 || password.length < 8)
      throw new BadRequestException(
        "Customer, username of at least 4 characters and password of at least 8 characters are required",
      );
    await this.db.customer.findUniqueOrThrow({ where: { id: b.customerId } });
    const existing = await this.db.bankingCredential.findUnique({
      where: { customerId: b.customerId },
    });
    const stamp = Date.now();
    const credential = existing
      ? await this.db.bankingCredential.update({
          where: { customerId: b.customerId },
          data: {
            username,
            passwordHash: this.passwordHash(password),
            status: b.activate === true ? "ACTIVE" : existing.status,
            kycStatus: existing.kycStatus,
            failedAttempts: 0,
            lockedAt: null,
          },
        })
      : await this.db.bankingCredential.create({
          data: {
            id: `IBC-${stamp}`,
            customerId: b.customerId,
            username,
            passwordHash: this.passwordHash(password),
            status: "ACTIVE",
            kycStatus: "VERIFIED",
            approvedAt: new Date(),
            approvedBy: "ADMIN",
          },
        });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "CORE_BANKING",
        action: existing ? "RESET_INTERNET_BANKING" : "CREATE_INTERNET_BANKING",
        customerId: b.customerId,
        resource: `BankingCredential/${credential.id}`,
        newValue: { username, status: credential.status },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return {
      reference: `IBCREDS-${stamp}`,
      credential: {
        customerId: credential.customerId,
        username: credential.username,
        status: credential.status,
      },
    };
  }
  @Patch("api/internet-banking/:customerId/status") async internetBankingStatus(
    @Param("customerId") customerId: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    if (
      !["ACTIVE", "LOCKED", "PENDING_APPROVAL", "REJECTED"].includes(b.status)
    )
      throw new BadRequestException("Unsupported Internet Banking status");
    const old = await this.db.bankingCredential.findUniqueOrThrow({
      where: { customerId },
    });
    const now = new Date();
    const credential = await this.db.bankingCredential.update({
      where: { customerId },
      data: {
        status: b.status,
        failedAttempts: b.status === "ACTIVE" ? 0 : old.failedAttempts,
        lockedAt: b.status === "LOCKED" ? now : null,
        approvedAt: b.status === "ACTIVE" ? now : old.approvedAt,
        approvedBy: b.status === "ACTIVE" ? "ADMIN" : old.approvedBy,
        rejectedAt: b.status === "REJECTED" ? now : null,
        rejectionReason:
          b.status === "REJECTED"
            ? String(b.reason || "Administrator decision")
            : null,
      },
    });
    const action =
      b.status === "ACTIVE"
        ? old.status === "PENDING_APPROVAL"
          ? "APPROVE_INTERNET_BANKING"
          : "UNLOCK_INTERNET_BANKING"
        : b.status === "REJECTED"
          ? "REJECT_INTERNET_BANKING"
          : b.status === "LOCKED"
            ? "LOCK_INTERNET_BANKING"
            : "PEND_INTERNET_BANKING";
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "CORE_BANKING",
        action,
        customerId,
        resource: `BankingCredential/${credential.id}`,
        previousValue: { status: old.status },
        newValue: { status: credential.status, reason: b.reason },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return {
      customerId,
      username: credential.username,
      status: credential.status,
      kycStatus: credential.kycStatus,
      lockedAt: credential.lockedAt,
      approvedAt: credential.approvedAt,
      rejectionReason: credential.rejectionReason,
    };
  }
  @Get("health") health() {
    return {
      status: "ok",
      service: "demohub24-mockbank-api",
      timestamp: new Date().toISOString(),
    };
  }
  @Get("api/health") apiHealth() {
    return this.health();
  }
  @Get("api/health/database") async dbHealth() {
    await this.db.$queryRaw`SELECT 1`;
    return { status: "ok", database: "postgresql" };
  }
  @ApiTags("customers") @Get("api/customers") customers() {
    return this.db.customer.findMany({ take: 100, orderBy: { id: "asc" } });
  }
  @ApiTags("customers") @Post("api/customers") async createCustomer(
    @Body() b: any,
    @Headers() h: any,
  ) {
    if (
      !b.englishName ||
      !b.thaiName ||
      !b.dateOfBirth ||
      !b.mobile ||
      !b.email
    )
      throw new BadRequestException(
        "English name, Thai name, date of birth, test mobile and test email are required",
      );
    const englishName = String(b.englishName).trim();
    const thaiName = String(b.thaiName).trim();
    const idNumber = String(b.idNumber || "XXXXXXXXXXX").trim();
    if (englishName.length < 3 || thaiName.length < 2)
      throw new BadRequestException("Valid English and Thai names are required");
    const duplicate = await this.db.customer.findFirst({
      where: {
        OR: [
          { englishName: { equals: englishName, mode: "insensitive" } },
          { thaiName: { equals: thaiName, mode: "insensitive" } },
        ],
      },
      select: { id: true, cif: true, englishName: true, thaiName: true },
    });
    if (duplicate)
      throw new ConflictException(
        `Customer name already exists (${duplicate.cif}: ${duplicate.englishName})`,
      );
    const birth = new Date(b.dateOfBirth);
    if (Number.isNaN(birth.getTime()) || birth >= new Date())
      throw new BadRequestException("A valid past date of birth is required");
    const stamp = Date.now();
    const customer = await this.db.customer.create({
      data: {
        id: `CUST-${stamp}`,
        cif: `CIF-${stamp}`,
        syntheticId: `TEST-NID-${stamp}`,
        idNumber: idNumber || "XXXXXXXXXXX",
        thaiName,
        englishName,
        dateOfBirth: birth,
        mobile: String(b.mobile),
        email: String(b.email),
        segment: b.segment || "MASS",
        preferredLanguage: b.preferredLanguage || "TH",
        preferredChannel: b.preferredChannel || "VOICE",
        vip: Boolean(b.vip),
        risk: b.risk || "LOW",
        marketingConsent: b.marketingConsent !== false,
        kycStatus: b.kycStatus || "NOT_VERIFIED",
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "CREATE_CUSTOMER",
        customerId: customer.id,
        resource: `Customer/${customer.id}`,
        newValue: {
          cif: customer.cif,
          englishName: customer.englishName,
          segment: customer.segment,
        },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return { reference: `CIF-${stamp}`, customer };
  }
  @ApiTags("customers")
  @Patch("api/customers/:id/profile")
  async updateCustomer(
    @Param("id") id: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    const old = await this.db.customer.findUniqueOrThrow({ where: { id } });
    const englishName = String(b.englishName ?? old.englishName).trim();
    const thaiName = String(b.thaiName ?? old.thaiName).trim();
    if (!englishName || !thaiName)
      throw new BadRequestException("English and Thai names cannot be empty");
    const duplicate = await this.db.customer.findFirst({
      where: {
        id: { not: id },
        OR: [
          { englishName: { equals: englishName, mode: "insensitive" } },
          { thaiName: { equals: thaiName, mode: "insensitive" } },
        ],
      },
      select: { cif: true, englishName: true },
    });
    if (duplicate)
      throw new ConflictException(
        `Customer name already exists (${duplicate.cif}: ${duplicate.englishName})`,
      );
    const birth = b.dateOfBirth ? new Date(b.dateOfBirth) : old.dateOfBirth;
    if (Number.isNaN(birth.getTime()) || birth >= new Date())
      throw new BadRequestException("A valid past date of birth is required");
    const customer = await this.db.customer.update({
      where: { id },
      data: {
        idNumber: String(b.idNumber ?? old.idNumber).trim() || "XXXXXXXXXXX",
        englishName,
        thaiName,
        dateOfBirth: birth,
        mobile: b.mobile ?? old.mobile,
        email: b.email ?? old.email,
        preferredLanguage: b.preferredLanguage ?? old.preferredLanguage,
        preferredChannel: b.preferredChannel ?? old.preferredChannel,
        marketingConsent: b.marketingConsent ?? old.marketingConsent,
        vip: b.vip ?? old.vip,
        risk: b.risk ?? old.risk,
        segment: b.segment ?? old.segment,
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "UPDATE_CUSTOMER_PROFILE",
        customerId: id,
        resource: `Customer/${id}`,
        previousValue: {
          idNumber: old.idNumber,
          englishName: old.englishName,
          thaiName: old.thaiName,
          dateOfBirth: old.dateOfBirth,
          mobile: old.mobile,
          email: old.email,
          segment: old.segment,
          risk: old.risk,
        },
        newValue: {
          idNumber: customer.idNumber,
          englishName: customer.englishName,
          thaiName: customer.thaiName,
          dateOfBirth: customer.dateOfBirth,
          mobile: customer.mobile,
          email: customer.email,
          segment: customer.segment,
          risk: customer.risk,
        },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return customer;
  }
  @ApiTags("customers")
  @Delete("api/customers/:id")
  async deleteCustomer(@Param("id") id: string, @Headers() h: any) {
    return this.db.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id },
        include: {
          accounts: { select: { id: true } },
          cards: { select: { id: true } },
          loans: { select: { id: true } },
        },
      });
      if (!customer) throw new NotFoundException("Customer was not found");

      const accountIds = customer.accounts.map((item) => item.id);
      const cardIds = customer.cards.map((item) => item.id);
      const loanIds = customer.loans.map((item) => item.id);
      if (accountIds.length)
        await tx.accountTransaction.deleteMany({
          where: { accountId: { in: accountIds } },
        });
      await tx.fraudAlert.deleteMany({ where: { customerId: id } });
      if (cardIds.length)
        await tx.cardTransaction.deleteMany({
          where: { cardId: { in: cardIds } },
        });
      if (loanIds.length)
        await tx.promiseToPay.deleteMany({
          where: { loanId: { in: loanIds } },
        });
      await tx.payment.deleteMany({ where: { customerId: id } });
      await tx.offer.deleteMany({ where: { customerId: id } });
      await tx.investment.deleteMany({ where: { customerId: id } });
      await tx.productApplication.deleteMany({ where: { customerId: id } });
      await tx.bankingCredential.deleteMany({ where: { customerId: id } });
      await tx.mobileBanking.deleteMany({ where: { customerId: id } });
      await tx.notification.deleteMany({ where: { customerId: id } });
      await tx.account.deleteMany({ where: { customerId: id } });
      await tx.card.deleteMany({ where: { customerId: id } });
      await tx.loan.deleteMany({ where: { customerId: id } });
      await tx.auditLog.updateMany({
        where: { customerId: id },
        data: { customerId: null },
      });
      await tx.customer.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actor: "ADMIN",
          sourceSystem: "CUSTOMER_CIF",
          action: "DELETE_CUSTOMER",
          resource: `Customer/${id}`,
          previousValue: {
            cif: customer.cif,
            idNumber: customer.idNumber,
            englishName: customer.englishName,
            thaiName: customer.thaiName,
          },
          result: "SUCCESS",
          ...this.ctx(h),
        },
      });
      const nextCustomer = await tx.customer.findFirst({
        select: { id: true },
        orderBy: { id: "asc" },
      });
      return {
        reference: `CUST-DELETE-${Date.now()}`,
        deletedCustomerId: id,
        nextCustomerId: nextCustomer?.id || null,
      };
    });
  }
  @ApiTags("customers") @Get("api/customers/search") async search(
    @Query("q") q = "",
    @Query("product") product = "ALL",
    @Query("page") pageValue = "1",
    @Query("pageSize") pageSizeValue = "10",
  ) {
    const keyword = q.trim();
    const page = Math.max(1, Number.parseInt(pageValue, 10) || 1);
    const allowedPageSizes = [10, 20, 50, 75, 100];
    const requestedPageSize = Number.parseInt(pageSizeValue, 10) || 10;
    const pageSize = allowedPageSizes.includes(requestedPageSize)
      ? requestedPageSize
      : 10;
    const productFilter: Record<string, any> = {
      DEPOSIT_ACCOUNT: { accounts: { some: {} } },
      CREDIT_CARD: { cards: { some: {} } },
      LOAN: { loans: { some: {} } },
      INVESTMENT: { investments: { some: {} } },
      MOBILE_BANKING: { mobileBanking: { isNot: null } },
      INTERNET_BANKING: { bankingCredential: { isNot: null } },
    };
    const where: any = {
        AND: [
          ...(keyword
            ? [
                {
                  OR: [
                    { id: { contains: keyword, mode: "insensitive" as const } },
                    { cif: { contains: keyword, mode: "insensitive" as const } },
                    { idNumber: { contains: keyword, mode: "insensitive" as const } },
                    {
                      englishName: {
                        contains: keyword,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      thaiName: {
                        contains: keyword,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              ]
            : []),
          ...(productFilter[product] ? [productFilter[product]] : []),
        ],
      };
    const [total, customers] = await Promise.all([
      this.db.customer.count({ where }),
      this.db.customer.findMany({
      where,
      include: {
        accounts: { select: { balance: true } },
        cards: { select: { id: true } },
        loans: { select: { id: true } },
        investments: { select: { id: true } },
        mobileBanking: { select: { id: true } },
        bankingCredential: { select: { id: true } },
      },
      orderBy: [{ englishName: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    ]);
    const items = customers.map((customer) => ({
      id: customer.id,
      cif: customer.cif,
      idNumber: customer.idNumber,
      thaiName: customer.thaiName,
      englishName: customer.englishName,
      segment: customer.segment,
      kycStatus: customer.kycStatus,
      relationshipBalance: customer.accounts.reduce(
        (sum, account) => sum + Number(account.balance),
        0,
      ),
      productTypes: [
        customer.accounts.length ? "DEPOSIT_ACCOUNT" : null,
        customer.cards.length ? "CREDIT_CARD" : null,
        customer.loans.length ? "LOAN" : null,
        customer.investments.length ? "INVESTMENT" : null,
        customer.mobileBanking ? "MOBILE_BANKING" : null,
        customer.bankingCredential ? "INTERNET_BANKING" : null,
      ].filter(Boolean),
    }));
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
  @ApiTags("customers")
  @Get("api/customers/product-summary")
  async customerProductSummary() {
    const [all, depositAccounts, creditCards, loans, investments, mobileBanking, internetBanking] = await Promise.all([
      this.db.customer.count(),
      this.db.customer.count({ where: { accounts: { some: {} } } }),
      this.db.customer.count({ where: { cards: { some: {} } } }),
      this.db.customer.count({ where: { loans: { some: {} } } }),
      this.db.customer.count({ where: { investments: { some: {} } } }),
      this.db.customer.count({ where: { mobileBanking: { isNot: null } } }),
      this.db.customer.count({ where: { bankingCredential: { isNot: null } } }),
    ]);
    return { ALL: all, DEPOSIT_ACCOUNT: depositAccounts, CREDIT_CARD: creditCards, LOAN: loans, INVESTMENT: investments, MOBILE_BANKING: mobileBanking, INTERNET_BANKING: internetBanking };
  }
  @ApiTags("customers") @Get("api/customers/:id") async customer(
    @Param("id") id: string,
  ) {
    return (
      (await this.db.customer.findUnique({ where: { id } })) ||
      (() => {
        throw new NotFoundException();
      })()
    );
  }
  @ApiTags("customers")
  @ApiOperation({ summary: "Aggregated Customer 360" })
  @Get("api/customers/:id/360")
  async c360(@Param("id") id: string) {
    return (
      (await this.db.c360(id)) ||
      (() => {
        throw new NotFoundException();
      })()
    );
  }
  @Get("api/customers/:id/accounts") accounts(@Param("id") id: string) {
    return this.db.account.findMany({ where: { customerId: id } });
  }
  @Get("api/accounts/:id") account(@Param("id") id: string) {
    return this.db.account.findUnique({ where: { id } });
  }
  @Get("api/accounts/:id/transactions") accountTx(@Param("id") id: string) {
    return this.db.accountTransaction.findMany({
      where: { accountId: id },
      orderBy: { occurredAt: "desc" },
    });
  }
  @Post("api/accounts") async createAccount(@Body() b: any, @Headers() h: any) {
    const opening = Number(b.openingBalance || 0);
    if (!b.customerId || !b.type || !Number.isFinite(opening) || opening < 0)
      throw new BadRequestException(
        "Customer, account type and a non-negative opening balance are required",
      );
    await this.db.customer.findUniqueOrThrow({ where: { id: b.customerId } });
    const stamp = Date.now();
    return this.db.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          id: `ACC-${stamp}`,
          customerId: b.customerId,
          type: String(b.type),
          maskedNumber: `XXX-X-TEST-${String(stamp).slice(-4)}`,
          balance: opening,
          availableBalance: opening,
          status: "ACTIVE",
          frozen: false,
          openedAt: new Date(),
        },
      });
      if (opening > 0)
        await tx.accountTransaction.create({
          data: {
            id: `ATX-${stamp}-OPEN`,
            accountId: account.id,
            type: "CREDIT",
            description: "Opening balance",
            amount: opening,
            occurredAt: new Date(),
          },
        });
      await tx.auditLog.create({
        data: {
          actor: "ADMIN",
          sourceSystem: "WEB",
          action: "OPEN_ACCOUNT",
          customerId: b.customerId,
          resource: `Account/${account.id}`,
          newValue: {
            type: account.type,
            maskedNumber: account.maskedNumber,
            openingBalance: opening,
          },
          result: "SUCCESS",
          ...this.ctx(h),
        },
      });
      return { reference: `AOP-${stamp}`, account };
    });
  }
  @Post("api/accounts/:id/transactions") async postAccountTransaction(
    @Param("id") id: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    const amount = Number(b.amount);
    const type = String(b.type || "").toUpperCase();
    if (
      !["DEPOSIT", "WITHDRAWAL"].includes(type) ||
      !Number.isFinite(amount) ||
      amount <= 0
    )
      throw new BadRequestException(
        "DEPOSIT or WITHDRAWAL and a positive amount are required",
      );
    return this.db.$transaction(async (tx) => {
      const account = await tx.account.findUniqueOrThrow({ where: { id } });
      if (account.status !== "ACTIVE" || account.frozen)
        throw new BadRequestException(
          "Account is not available for transactions",
        );
      if (type === "WITHDRAWAL" && Number(account.availableBalance) < amount)
        throw new BadRequestException("Insufficient available balance");
      const delta = type === "DEPOSIT" ? amount : -amount;
      const updated = await tx.account.update({
        where: { id },
        data: {
          balance:
            type === "DEPOSIT" ? { increment: amount } : { decrement: amount },
          availableBalance:
            type === "DEPOSIT" ? { increment: amount } : { decrement: amount },
        },
      });
      const stamp = Date.now();
      const transaction = await tx.accountTransaction.create({
        data: {
          id: `ATX-${stamp}`,
          accountId: id,
          type: type === "DEPOSIT" ? "CREDIT" : "DEBIT",
          description: String(b.description || type),
          amount: delta,
          occurredAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actor: "ADMIN",
          sourceSystem: "WEB",
          action: type,
          customerId: account.customerId,
          resource: `Account/${id}`,
          previousValue: { availableBalance: account.availableBalance },
          newValue: {
            availableBalance: updated.availableBalance,
            amount,
            transactionId: transaction.id,
          },
          result: "SUCCESS",
          ...this.ctx(h),
        },
      });
      return { reference: `TXN-${stamp}`, account: updated, transaction };
    });
  }
  @Patch("api/accounts/:id/control") async controlAccount(
    @Param("id") id: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    const old = await this.db.account.findUniqueOrThrow({ where: { id } });
    const account = await this.db.account.update({
      where: { id },
      data: { status: b.status ?? old.status, frozen: b.frozen ?? old.frozen },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "ACCOUNT_CONTROL",
        customerId: old.customerId,
        resource: `Account/${id}`,
        previousValue: { status: old.status, frozen: old.frozen },
        newValue: { status: account.status, frozen: account.frozen },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return account;
  }
  @Get("api/customers/:id/cards") cards(@Param("id") id: string) {
    return this.db.card.findMany({ where: { customerId: id } });
  }
  @Get("api/cards/:id") card(@Param("id") id: string) {
    return this.db.card.findUnique({ where: { id } });
  }
  @Get("api/cards/:id/transactions") cardTx(@Param("id") id: string) {
    return this.db.cardTransaction.findMany({
      where: { cardId: id },
      orderBy: { occurredAt: "desc" },
    });
  }
  @Post("api/cards/:id/transactions") async postCardTransaction(
    @Param("id") id: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    const amount = Number(b.amount);
    const type = String(b.type || "PURCHASE").toUpperCase();
    if (
      !["PURCHASE", "REFUND"].includes(type) ||
      !b.merchant ||
      !Number.isFinite(amount) ||
      amount <= 0
    )
      throw new BadRequestException(
        "Merchant, PURCHASE or REFUND, and a positive amount are required",
      );
    return this.db.$transaction(async (tx) => {
      const card = await tx.card.findUniqueOrThrow({ where: { id } });
      if (card.status !== "ACTIVE")
        throw new BadRequestException("Card is not active");
      if (type === "PURCHASE" && Number(card.availableCredit) < amount)
        throw new BadRequestException("Insufficient available credit");
      const updated = await tx.card.update({
        where: { id },
        data: {
          availableCredit:
            type === "PURCHASE" ? { decrement: amount } : { increment: amount },
          rewardPoints:
            type === "PURCHASE"
              ? { increment: Math.floor(amount / 25) }
              : undefined,
        },
      });
      const stamp = Date.now();
      const transaction = await tx.cardTransaction.create({
        data: {
          id: `CTX-${stamp}`,
          cardId: id,
          merchant: String(b.merchant),
          amount: type === "PURCHASE" ? amount : -amount,
          status: type === "PURCHASE" ? "POSTED" : "REFUNDED",
          occurredAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actor: "ADMIN",
          sourceSystem: "WEB",
          action: `CARD_${type}`,
          customerId: card.customerId,
          resource: `CardTransaction/${transaction.id}`,
          newValue: {
            merchant: b.merchant,
            amount,
            type,
            availableCredit: updated.availableCredit,
          },
          result: "SUCCESS",
          ...this.ctx(h),
        },
      });
      return { reference: `CTXREF-${stamp}`, card: updated, transaction };
    });
  }
  @Post("api/cards/:id/card-fee") async chargeCardFee(
    @Param("id") id: string,
    @Headers() h: any,
  ) {
    const amount = 5000;
    return this.db.$transaction(async (tx) => {
      const card = await tx.card.findUniqueOrThrow({ where: { id } });
      if (card.status !== "ACTIVE")
        throw new BadRequestException("Card is not active");
      if (Number(card.availableCredit) < amount)
        throw new BadRequestException("Insufficient available credit for card fee");
      const updated = await tx.card.update({
        where: { id },
        data: { availableCredit: { decrement: amount } },
      });
      const stamp = Date.now();
      const transaction = await tx.cardTransaction.create({
        data: {
          id: `CTX-FEE-${stamp}`,
          cardId: id,
          merchant: "CREDIT CARD FEE",
          amount,
          status: "POSTED",
          occurredAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actor: "ADMIN",
          sourceSystem: "CREDIT_CARD_BACKEND",
          action: "CHARGE_CREDIT_CARD_FEE",
          customerId: card.customerId,
          resource: `CardTransaction/${transaction.id}`,
          newValue: { amount, description: transaction.merchant, availableCredit: updated.availableCredit },
          result: "SUCCESS",
          ...this.ctx(h),
        },
      });
      return { reference: `CARDFEE-${stamp}`, card: updated, transaction };
    });
  }
  @Post("api/cards/:id/card-fee/:transactionId/waive") async waiveCardFee(
    @Param("id") id: string,
    @Param("transactionId") transactionId: string,
    @Headers() h: any,
  ) {
    const amount = 5000;
    return this.db.$transaction(async (tx) => {
      const [card, fee] = await Promise.all([
        tx.card.findUniqueOrThrow({ where: { id } }),
        tx.cardTransaction.findUniqueOrThrow({ where: { id: transactionId } }),
      ]);
      if (
        fee.cardId !== id ||
        fee.merchant !== "CREDIT CARD FEE" ||
        Number(fee.amount) !== amount
      )
        throw new BadRequestException("The selected transaction is not a card fee");
      if (fee.status !== "POSTED")
        throw new ConflictException("This card fee has already been waived");
      const availableCredit = Math.min(
        Number(card.creditLimit),
        Number(card.availableCredit) + amount,
      );
      const stamp = Date.now();
      const [, updated, refund] = await Promise.all([
        tx.cardTransaction.update({
          where: { id: transactionId },
          data: { status: "WAIVED" },
        }),
        tx.card.update({ where: { id }, data: { availableCredit } }),
        tx.cardTransaction.create({
          data: {
            id: `CTX-FEE-REFUND-${stamp}`,
            cardId: id,
            merchant: "CREDIT CARD FEE REFUND",
            amount: -amount,
            status: "REFUNDED",
            occurredAt: new Date(),
          },
        }),
      ]);
      await tx.auditLog.create({
        data: {
          actor: "ADMIN",
          sourceSystem: "CREDIT_CARD_BACKEND",
          action: "WAIVE_CREDIT_CARD_FEE",
          customerId: card.customerId,
          resource: `CardTransaction/${transactionId}`,
          previousValue: { status: fee.status, amount: fee.amount },
          newValue: { status: "WAIVED", refundTransactionId: refund.id, availableCredit: updated.availableCredit },
          result: "SUCCESS",
          ...this.ctx(h),
        },
      });
      return { reference: `CARDFEE-WAIVE-${stamp}`, card: updated, transaction: refund };
    });
  }
  @Get("api/customers/:id/loans") loans(@Param("id") id: string) {
    return this.db.loan.findMany({ where: { customerId: id } });
  }
  @Post("api/loans") async createLoan(@Body() b: any, @Headers() h: any) {
    const principal = Number(b.originalPrincipal),
      rate = Number(b.interestRate),
      payment = Number(b.monthlyPayment);
    if (
      !b.customerId ||
      !b.product ||
      !Number.isFinite(principal) ||
      principal <= 0 ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      !Number.isFinite(payment) ||
      payment <= 0
    )
      throw new BadRequestException(
        "Customer, product, principal, interest rate and monthly payment are required",
      );
    await this.db.customer.findUniqueOrThrow({ where: { id: b.customerId } });
    const stamp = Date.now();
    const nextDueDate = new Date();
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    const loan = await this.db.loan.create({
      data: {
        id: `LOAN-${stamp}`,
        customerId: b.customerId,
        product: String(b.product),
        originalPrincipal: principal,
        outstandingPrincipal: principal,
        interestRate: rate,
        monthlyPayment: payment,
        nextDueDate,
        daysPastDue: 0,
        status: "ACTIVE",
        collectionStage: null,
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "BOOK_LOAN",
        customerId: b.customerId,
        resource: `Loan/${loan.id}`,
        newValue: {
          product: loan.product,
          principal,
          interestRate: rate,
          monthlyPayment: payment,
        },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return { reference: `LON-${stamp}`, loan };
  }
  @Get("api/customers/:id/mobile-banking") mobile(@Param("id") id: string) {
    return this.db.mobileBanking.findUnique({ where: { customerId: id } });
  }
  @Post("api/mobile") async registerMobile(@Body() b: any, @Headers() h: any) {
    if (!b.customerId || !b.deviceName)
      throw new BadRequestException("Customer and device name are required");
    await this.db.customer.findUniqueOrThrow({ where: { id: b.customerId } });
    const stamp = Date.now();
    const mobile = await this.db.mobileBanking.upsert({
      where: { customerId: b.customerId },
      create: {
        id: `MOB-${stamp}`,
        customerId: b.customerId,
        status: "ACTIVE",
        deviceId: `DEV-TEST-${String(stamp).slice(-6)}`,
        deviceName: String(b.deviceName),
        lastLogin: new Date(),
        failedLoginCount: 0,
        locked: false,
        registrationStatus: "REGISTERED",
      },
      update: {
        status: "ACTIVE",
        deviceId: `DEV-TEST-${String(stamp).slice(-6)}`,
        deviceName: String(b.deviceName),
        lastLogin: new Date(),
        failedLoginCount: 0,
        locked: false,
        registrationStatus: "REGISTERED",
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "REGISTER_MOBILE_DEVICE",
        customerId: b.customerId,
        resource: `MobileBanking/${mobile.id}`,
        newValue: {
          deviceId: mobile.deviceId,
          deviceName: mobile.deviceName,
          status: mobile.status,
        },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return { reference: `MREG-${stamp}`, mobileBanking: mobile };
  }
  @Get("api/customers/:id/payments") payments(@Param("id") id: string) {
    return this.db.payment.findMany({ where: { customerId: id } });
  }
  @Patch("api/payments/:id/status") async paymentStatus(
    @Param("id") id: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    const allowed = [
      "SUCCESS",
      "FAILED",
      "PENDING",
      "REVERSED",
      "REFUND_PENDING",
      "REFUNDED",
    ];
    if (!allowed.includes(b.status))
      throw new BadRequestException("Unsupported payment status");
    const old = await this.db.payment.findUniqueOrThrow({ where: { id } });
    const payment = await this.db.payment.update({
      where: { id },
      data: {
        status: b.status,
        failureReason: b.failureReason ?? old.failureReason,
        refundStatus:
          b.status === "REFUNDED"
            ? "COMPLETED"
            : b.status === "REFUND_PENDING"
              ? "PENDING"
              : old.refundStatus,
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "UPDATE_PAYMENT_STATUS",
        customerId: old.customerId,
        resource: `Payment/${id}`,
        previousValue: { status: old.status },
        newValue: {
          status: payment.status,
          failureReason: payment.failureReason,
          refundStatus: payment.refundStatus,
        },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return payment;
  }
  @Get("api/customers/:id/fraud-alerts") fraud(@Param("id") id: string) {
    return this.db.fraudAlert.findMany({ where: { customerId: id } });
  }
  @Post("api/fraud-alerts") async createFraud(
    @Body() b: any,
    @Headers() h: any,
  ) {
    const score = Number(b.riskScore);
    if (
      !b.customerId ||
      !b.fraudType ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > 100
    )
      throw new BadRequestException(
        "Customer, fraud type and risk score from 0 to 100 are required",
      );
    await this.db.customer.findUniqueOrThrow({ where: { id: b.customerId } });
    const stamp = Date.now();
    const alert = await this.db.fraudAlert.create({
      data: {
        id: `FRAUD-${stamp}`,
        customerId: b.customerId,
        transactionId: b.transactionId || null,
        fraudType: String(b.fraudType),
        riskScore: score,
        reasons: Array.isArray(b.reasons)
          ? b.reasons
          : [String(b.reasons || "Manual review")],
        status: "OPEN",
        investigationStatus: "NEW",
        notes: b.notes || null,
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "CREATE_FRAUD_ALERT",
        customerId: b.customerId,
        resource: `FraudAlert/${alert.id}`,
        newValue: {
          fraudType: alert.fraudType,
          riskScore: score,
          status: alert.status,
        },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return { reference: `FAL-${stamp}`, alert };
  }
  @Get("api/customers/:id/kyc") async kyc(@Param("id") id: string) {
    const c = await this.db.customer.findUnique({
      where: { id },
      select: { kycStatus: true, risk: true, updatedAt: true },
    });
    return c;
  }
  @Get("api/customers/:id/offers") offers(@Param("id") id: string) {
    return this.db.offer.findMany({ where: { customerId: id } });
  }
  @Post("api/offers") async createOffer(@Body() b: any, @Headers() h: any) {
    const priority = Number(b.priority);
    if (
      !b.customerId ||
      !b.product ||
      !b.reason ||
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 10
    )
      throw new BadRequestException(
        "Customer, product, reason and priority from 1 to 10 are required",
      );
    await this.db.customer.findUniqueOrThrow({ where: { id: b.customerId } });
    const stamp = Date.now();
    const offer = await this.db.offer.create({
      data: {
        id: `OFFER-${stamp}`,
        customerId: b.customerId,
        product: String(b.product),
        reason: String(b.reason),
        priority,
        status: "ELIGIBLE",
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "CREATE_OFFER",
        customerId: b.customerId,
        resource: `Offer/${offer.id}`,
        newValue: { product: offer.product, reason: offer.reason, priority },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return { reference: `OFR-${stamp}`, offer };
  }
  @Get("api/audit") audit() {
    return this.db.auditLog.findMany({
      take: 100,
      orderBy: { timestamp: "desc" },
    });
  }
  @Get("api/notifications") notifications(
    @Query("customerId") customerId?: string,
  ) {
    return this.db.notification.findMany({
      where: customerId ? { customerId } : {},
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  }
  @Get("api/investments") investments(
    @Query("customerId") customerId?: string,
  ) {
    return this.db.investment.findMany({
      where: customerId ? { customerId } : {},
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  }
  @Get("api/admin/summary") async adminSummary() {
    const [
      customers,
      accounts,
      cards,
      loans,
      payments,
      alerts,
      notifications,
      audits,
    ] = await Promise.all([
      this.db.customer.count(),
      this.db.account.count(),
      this.db.card.count(),
      this.db.loan.count(),
      this.db.payment.count(),
      this.db.fraudAlert.count(),
      this.db.notification.count(),
      this.db.auditLog.count(),
    ]);
    return {
      customers,
      accounts,
      cards,
      loans,
      payments,
      alerts,
      notifications,
      audits,
      seedVersion: (
        await this.db.labState.findUnique({ where: { id: "singleton" } })
      )?.seedVersion,
    };
  }
  @Post("api/operations/transfer") async transfer(
    @Body() b: any,
    @Headers() h: any,
  ) {
    const amount = Number(b.amount);
    if (
      !b.sourceAccountId ||
      !b.customerId ||
      !b.destination ||
      !Number.isFinite(amount) ||
      amount <= 0
    )
      throw new BadRequestException(
        "Source account, customer, destination and positive amount are required",
      );
    return this.db.$transaction(async (tx) => {
      const account = await tx.account.findUniqueOrThrow({
        where: { id: b.sourceAccountId },
      });
      if (account.customerId !== b.customerId)
        throw new BadRequestException("Account does not belong to customer");
      if (account.frozen || account.status !== "ACTIVE")
        throw new BadRequestException("Account is not available for transfer");
      if (Number(account.availableBalance) < amount)
        throw new BadRequestException("Insufficient available balance");
      const stamp = Date.now();
      const reference = `PAY-${stamp}`;
      const updated = await tx.account.update({
        where: { id: account.id },
        data: {
          balance: { decrement: amount },
          availableBalance: { decrement: amount },
        },
      });
      const transaction = await tx.accountTransaction.create({
        data: {
          id: `ATX-${stamp}`,
          accountId: account.id,
          type: "DEBIT",
          description: `Transfer to ${b.destination}`,
          amount: -amount,
          occurredAt: new Date(),
        },
      });
      const destinationAccount = await tx.account.findFirst({
        where: {
          OR: [
            { id: String(b.destination) },
            { maskedNumber: String(b.destination) },
          ],
        },
      });
      let destinationTransaction = null;
      if (destinationAccount && destinationAccount.id !== account.id) {
        await tx.account.update({
          where: { id: destinationAccount.id },
          data: {
            balance: { increment: amount },
            availableBalance: { increment: amount },
          },
        });
        destinationTransaction = await tx.accountTransaction.create({
          data: {
            id: `ATX-${stamp}-CR`,
            accountId: destinationAccount.id,
            type: "CREDIT",
            description: `Transfer from ${account.maskedNumber}`,
            amount,
            occurredAt: new Date(),
          },
        });
      }
      const payment = await tx.payment.create({
        data: {
          id: `PMT-${stamp}`,
          customerId: b.customerId,
          sourceAccount: account.maskedNumber,
          destination: String(b.destination),
          amount,
          channel: b.channel || "INTERNET_BANKING",
          status: "SUCCESS",
          reference,
        },
      });
      await tx.auditLog.create({
        data: {
          actor: "ADMIN",
          sourceSystem: "WEB",
          action: "CREATE_TRANSFER",
          customerId: b.customerId,
          resource: `Payment/${payment.id}`,
          newValue: { reference, amount, destination: b.destination },
          result: "SUCCESS",
          ...this.ctx(h),
        },
      });
      return {
        reference,
        account: updated,
        transaction,
        destinationTransaction,
        payment,
      };
    });
  }
  @Post("api/cards") async createCard(@Body() b: any, @Headers() h: any) {
    const limit = Number(b.creditLimit);
    if (
      !b.customerId ||
      !b.product ||
      !Number.isFinite(limit) ||
      limit < 10000 ||
      limit > 5000000
    )
      throw new BadRequestException(
        "Customer, product and a credit limit between 10,000 and 5,000,000 THB are required",
      );
    await this.db.customer.findUniqueOrThrow({ where: { id: b.customerId } });
    const stamp = Date.now();
    const last4 = String(stamp).slice(-4);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const card = await this.db.card.create({
      data: {
        id: `CARD-${stamp}`,
        customerId: b.customerId,
        maskedNumber: `4599-TEST-XXXX-${last4}`,
        product: String(b.product),
        status: "ACTIVE",
        creditLimit: limit,
        availableCredit: limit,
        rewardPoints: 0,
        dueDate,
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "ISSUE_SYNTHETIC_CARD",
        customerId: b.customerId,
        resource: `Card/${card.id}`,
        newValue: {
          product: card.product,
          maskedNumber: card.maskedNumber,
          creditLimit: card.creditLimit,
          status: card.status,
        },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return { reference: `ISS-${stamp}`, card };
  }
  @Patch("api/cards/:id/status") async cardStatus(
    @Param("id") id: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    if (!["ACTIVE", "BLOCKED", "EXPIRED"].includes(b.status))
      throw new BadRequestException("Unsupported card status");
    const old = await this.db.card.findUniqueOrThrow({ where: { id } });
    const card = await this.db.card.update({
      where: { id },
      data: { status: b.status },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: `CARD_${b.status}`,
        customerId: old.customerId,
        resource: `Card/${id}`,
        previousValue: { status: old.status },
        newValue: { status: card.status, reason: b.reason },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return card;
  }
  @Post("api/cards/:id/replacement") async replaceCard(
    @Param("id") id: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    const old = await this.db.card.findUniqueOrThrow({ where: { id } });
    const card = await this.db.card.update({
      where: { id },
      data: { status: "BLOCKED" },
    });
    const reference = `CRP-${Date.now()}`;
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "REQUEST_CARD_REPLACEMENT",
        customerId: old.customerId,
        resource: `Card/${id}`,
        previousValue: { status: old.status },
        newValue: {
          status: card.status,
          reason: b.reason || "CUSTOMER_REQUEST",
          reference,
        },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return { reference, card };
  }
  @Post("api/loans/:id/payment") async loanPayment(
    @Param("id") id: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount <= 0)
      throw new BadRequestException("Positive payment amount is required");
    const loan = await this.db.loan.findUniqueOrThrow({ where: { id } });
    if (amount > Number(loan.outstandingPrincipal))
      throw new BadRequestException("Payment exceeds outstanding principal");
    const updated = await this.db.loan.update({
      where: { id },
      data: {
        outstandingPrincipal: { decrement: amount },
        daysPastDue: 0,
        collectionStage: null,
        status:
          amount === Number(loan.outstandingPrincipal) ? "PAID" : "ACTIVE",
      },
    });
    const reference = `LPM-${Date.now()}`;
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "LOAN_PAYMENT",
        customerId: loan.customerId,
        resource: `Loan/${id}`,
        previousValue: { outstandingPrincipal: loan.outstandingPrincipal },
        newValue: {
          outstandingPrincipal: updated.outstandingPrincipal,
          amount,
          reference,
        },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return { reference, loan: updated };
  }
  @Patch("api/mobile/:customerId/status") async mobileStatus(
    @Param("customerId") id: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    const allowed = [
      "ACTIVE",
      "LOCKED",
      "DEVICE_CHANGE_REQUIRED",
      "PASSWORD_RESET_REQUIRED",
      "SUSPENDED",
    ];
    if (!allowed.includes(b.status))
      throw new BadRequestException("Unsupported mobile status");
    const old = await this.db.mobileBanking.findUniqueOrThrow({
      where: { customerId: id },
    });
    const mobile = await this.db.mobileBanking.update({
      where: { customerId: id },
      data: { status: b.status, locked: b.status === "LOCKED" },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "UPDATE_MOBILE_STATUS",
        customerId: id,
        resource: `MobileBanking/${old.id}`,
        previousValue: { status: old.status },
        newValue: { status: mobile.status },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return mobile;
  }
  @Patch("api/customers/:id/kyc") async updateKyc(
    @Param("id") id: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    const allowed = [
      "NOT_VERIFIED",
      "PARTIALLY_VERIFIED",
      "VERIFIED",
      "FAILED",
      "EXPIRED",
    ];
    if (!allowed.includes(b.status))
      throw new BadRequestException("Unsupported KYC status");
    const old = await this.db.customer.findUniqueOrThrow({ where: { id } });
    const customer = await this.db.customer.update({
      where: { id },
      data: { kycStatus: b.status },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "UPDATE_KYC",
        customerId: id,
        resource: `Customer/${id}`,
        previousValue: { kycStatus: old.kycStatus },
        newValue: { kycStatus: customer.kycStatus },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return customer;
  }
  @Patch("api/fraud-alerts/:id") async updateFraud(
    @Param("id") id: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    const old = await this.db.fraudAlert.findUniqueOrThrow({ where: { id } });
    const alert = await this.db.fraudAlert.update({
      where: { id },
      data: {
        status: b.status || old.status,
        investigationStatus: b.investigationStatus || old.investigationStatus,
        notes: b.notes ?? old.notes,
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "UPDATE_FRAUD_ALERT",
        customerId: old.customerId,
        resource: `FraudAlert/${id}`,
        previousValue: {
          status: old.status,
          investigationStatus: old.investigationStatus,
        },
        newValue: {
          status: alert.status,
          investigationStatus: alert.investigationStatus,
          notes: alert.notes,
        },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return alert;
  }
  @Patch("api/offers/:id") async updateOffer(
    @Param("id") id: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    const old = await this.db.offer.findUniqueOrThrow({ where: { id } });
    const offer = await this.db.offer.update({
      where: { id },
      data: { status: b.status || old.status },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "UPDATE_OFFER",
        customerId: old.customerId,
        resource: `Offer/${id}`,
        previousValue: { status: old.status },
        newValue: { status: offer.status },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return offer;
  }
  @Post("api/notifications") async createNotification(
    @Body() b: any,
    @Headers() h: any,
  ) {
    if (!b.customerId || !b.channel || !b.message)
      throw new BadRequestException(
        "Customer, channel and message are required",
      );
    const notification = await this.db.notification.create({
      data: {
        id: `NTF-${Date.now()}`,
        customerId: b.customerId,
        channel: b.channel,
        template: b.template || "CUSTOM",
        message: b.message,
        status: "SIMULATED",
        correlationId: h["x-correlation-id"],
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "SIMULATE_NOTIFICATION",
        customerId: b.customerId,
        resource: `Notification/${notification.id}`,
        newValue: { channel: b.channel, status: notification.status },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return notification;
  }
  @Post("api/investments") async createInvestment(
    @Body() b: any,
    @Headers() h: any,
  ) {
    const units = Number(b.units),
      unitPrice = Number(b.unitPrice),
      costBasis = Number(b.costBasis);
    if (
      !b.customerId ||
      !b.product ||
      !Number.isFinite(units) ||
      units <= 0 ||
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    )
      throw new BadRequestException(
        "Customer, product, units and unit price are required",
      );
    const investment = await this.db.investment.create({
      data: {
        id: `INV-${Date.now()}`,
        customerId: b.customerId,
        product: b.product,
        assetType: b.assetType || "MUTUAL_FUND",
        units,
        unitPrice,
        marketValue: units * unitPrice,
        costBasis: Number.isFinite(costBasis) ? costBasis : units * unitPrice,
        currency: b.currency || "THB",
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: "ADMIN",
        sourceSystem: "WEB",
        action: "ADD_SIMULATED_INVESTMENT",
        customerId: b.customerId,
        resource: `Investment/${investment.id}`,
        newValue: { product: b.product, marketValue: investment.marketValue },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return investment;
  }
  @Patch("legacy/cards/:id/block") async block(
    @Param("id") id: string,
    @Body() body: any,
    @Headers() h: any,
  ) {
    const old = await this.db.card.findUniqueOrThrow({ where: { id } });
    const card = await this.db.card.update({
      where: { id },
      data: { status: "BLOCKED" },
    });
    await this.db.auditLog.create({
      data: {
        actor: body.actor || "RPA",
        sourceSystem: "UIPATH",
        action: "BLOCK_CARD",
        customerId: old.customerId,
        resource: `Card/${id}`,
        previousValue: { status: old.status },
        newValue: { status: card.status, reason: body.reason },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return { reference: `BLK-${Date.now()}`, card };
  }
  @Post("legacy/mobile/:customerId/reset") async resetMobile(
    @Param("customerId") id: string,
    @Headers() h: any,
  ) {
    const m = await this.db.mobileBanking.update({
      where: { customerId: id },
      data: {
        deviceId: null,
        deviceName: null,
        registrationStatus: "RESET_PENDING",
        status: "DEVICE_CHANGE_REQUIRED",
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: "RPA",
        sourceSystem: "UIPATH",
        action: "RESET_DEVICE",
        customerId: id,
        resource: `MobileBanking/${m.id}`,
        newValue: { registrationStatus: m.registrationStatus },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return { reference: `MOB-${Date.now()}`, mobileBanking: m };
  }
  @Post("legacy/loans/:id/promise-to-pay") async ptp(
    @Param("id") id: string,
    @Body() b: any,
    @Headers() h: any,
  ) {
    const loan = await this.db.loan.findUniqueOrThrow({ where: { id } });
    const p = await this.db.promiseToPay.create({
      data: {
        id: `PTP-${Date.now()}`,
        loanId: id,
        amount: b.amount,
        promiseDate: new Date(b.promiseDate),
        reference: `PTPREF-${Date.now()}`,
      },
    });
    await this.db.auditLog.create({
      data: {
        actor: "RPA",
        sourceSystem: "UIPATH",
        action: "CREATE_PTP",
        customerId: loan.customerId,
        resource: `Loan/${id}`,
        newValue: {
          amount: b.amount,
          promiseDate: b.promiseDate,
          reference: p.reference,
        },
        result: "SUCCESS",
        ...this.ctx(h),
      },
    });
    return p;
  }
}
