import { call } from "@/lib/account/api";
import type { Locale } from "@/lib/site-config";
import type { ContactChannel } from "./contact";

export interface FeaturePrice {
	key: string;
	nameEn: string;
	nameAr: string;
	descriptionEn: string | null;
	descriptionAr: string | null;
	lenses: number;
	enabled: boolean;
}
export interface Pricing {
	currency: "USD";
	available: boolean;
	lensPriceUsd: string | null;
	lensPriceMicros: number | null;
	trialLenses: number;
	request: { min: number; max: number; pendingMax: number };
	cloudAi: { enabled: boolean };
	features: FeaturePrice[];
}
export type NoticeType = "TRIAL_GIFT" | "ADMIN_GIFT" | "TOP_UP";
export interface Notice {
	id: string;
	type: NoticeType;
	lenses: number;
	note: string | null;
	createdAt: string;
}
export type TransactionType =
	| NoticeType
	| "ADMIN_ADJUSTMENT"
	| "AI_CHARGE"
	| "AI_REFUND";
export interface Transaction {
	id: string;
	type: TransactionType;
	delta: number;
	balanceAfter: number;
	feature: string | null;
	note: string | null;
	createdAt: string;
}
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export interface LensRequest {
	id: string;
	lenses: number;
	unitPriceUsd: string;
	totalUsd: string;
	status: RequestStatus;
	contactChannel: ContactChannel;
	contactHandle: string;
	note: string | null;
	rejectionReason: string | null;
	createdAt: string;
	reviewedAt: string | null;
	cancelledAt: string | null;
}
export interface Page<T> {
	data: T[];
	page: number;
	pageSize: number;
	total: number;
}

/** Public prices: the only source of numbers for the pricing and balance pages. */
export function getPricing(locale: Locale): Promise<Pricing> {
	return call("/api/user/billing/pricing", { locale });
}

export function getBalance(
	locale: Locale,
): Promise<{ balance: number; notices: Notice[] }> {
	return call("/api/user/billing/balance?surface=website", {
		locale,
		web: true,
	});
}

/** Marks notices as shown on the website only; the extension celebrates on its own (D12). */
export function markNoticesSeen(
	locale: Locale,
	ids: string[],
): Promise<{ updated: number }> {
	return call("/api/user/billing/notices/seen", {
		locale,
		method: "POST",
		body: { ids, surface: "website" },
		web: true,
	});
}

export function getTransactions(
	locale: Locale,
	page: number,
): Promise<Page<Transaction>> {
	return call(`/api/user/billing/transactions?page=${page}&pageSize=10`, {
		locale,
		web: true,
	});
}

export function getRequests(
	locale: Locale,
	page: number,
): Promise<
	Page<LensRequest> & {
		lastContact: { channel: ContactChannel; handle: string } | null;
	}
> {
	return call(`/api/user/billing/requests?page=${page}&pageSize=5`, {
		locale,
		web: true,
	});
}

export function createRequest(
	locale: Locale,
	values: {
		id: string;
		lenses: number;
		quotedLensPriceUsd: string;
		contactChannel: ContactChannel;
		contactHandle: string;
		note?: string;
	},
): Promise<{ request: LensRequest }> {
	return call("/api/user/billing/requests", {
		locale,
		method: "POST",
		body: values,
		web: true,
	});
}

export function cancelRequest(
	locale: Locale,
	id: string,
): Promise<{ request: LensRequest }> {
	return call(`/api/user/billing/requests/${id}/cancel`, {
		locale,
		method: "POST",
		body: {},
		web: true,
	});
}
