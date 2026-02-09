import crypto from 'crypto';

const BILLPLZ_BASE_URL = 'https://www.billplz.com/api';

interface CreateCollectionResponse {
  id: string;
  title: string;
  description: string;
  status: string;
}

interface CreateBillResponse {
  id: string;
  collection_id: string;
  state: string;
  amount: number;
  paid_amount: number;
  paid: boolean;
  due_at: string;
  email: string;
  mobile: string | null;
  name: string;
  url: string;
  reference_1_label: string | null;
  reference_1: string | null;
  reference_2_label: string | null;
  reference_2: string | null;
  redirect_url: string | null;
  callback_url: string | null;
  description: string;
}

interface GetBillResponse {
  amount: number;
  collection_id: string;
  due_at: string;
  email: string;
  id: string;
  mobile: string | null;
  name: string;
  paid: boolean;
  paid_amount: number;
  paid_at: string | null;
  state: string;
  url: string;
}


let collectionId: string | null = null;

async function ensureCollectionExists(): Promise<string> {
  if (collectionId) {
    return collectionId;
  }

  if (!process.env.BILLPLZ_SECRET_KEY) {
    throw new Error('BILLPLZ_SECRET_KEY not configured');
  }

  try {
    // Create collection for AECOIN Store
    const response = await fetch(`${BILLPLZ_BASE_URL}/v3/collections`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(process.env.BILLPLZ_SECRET_KEY + ':').toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'AECOIN Store',
        description: 'GTA Online virtual currency packages',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Billplz collection creation failed:', errorText);
      throw new Error(`Failed to create Billplz collection: ${errorText}`);
    }

    const data = await response.json() as CreateCollectionResponse;
    
    if (!data.id) {
      console.error('Invalid collection response:', data);
      throw new Error('Failed to create Billplz collection: No ID returned');
    }

    collectionId = data.id;
    console.log('✓ Billplz collection created:', collectionId);
    
    return collectionId;
  } catch (error) {
    console.error('Billplz collection creation error:', error);
    throw error;
  }
}

export async function createBill(params: {
  description: string;
  amount: number; // in MYR (will be converted to cents)
  name: string;
  email: string;
  mobile?: string;
  callbackUrl: string;
  redirectUrl: string;
  reference1Label?: string;
  reference1?: string;
}): Promise<CreateBillResponse> {
  if (!process.env.BILLPLZ_SECRET_KEY) {
    throw new Error('BILLPLZ_SECRET_KEY not configured');
  }

  const collId = await ensureCollectionExists();

  try {
    // Convert amount to cents (Billplz expects amount in cents)
    const amountInCents = Math.round(params.amount * 100);

    const billData: any = {
      collection_id: collId,
      description: params.description,
      email: params.email,
      name: params.name,
      amount: amountInCents,
      callback_url: params.callbackUrl,
      redirect_url: params.redirectUrl,
    };

    if (params.mobile) {
      billData.mobile = params.mobile;
    }

    if (params.reference1Label && params.reference1) {
      billData.reference_1_label = params.reference1Label;
      billData.reference_1 = params.reference1;
    }

    const response = await fetch(`${BILLPLZ_BASE_URL}/v3/bills`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(process.env.BILLPLZ_SECRET_KEY + ':').toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(billData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Billplz bill creation failed:', errorText);
      throw new Error(`Failed to create Billplz bill: ${errorText}`);
    }

    const data = await response.json() as CreateBillResponse;
    
    if (!data.id || !data.url) {
      console.error('Invalid bill response:', data);
      throw new Error('Failed to create Billplz bill: Invalid response');
    }

    console.log('✓ Billplz bill created:', data.id);
    return data;
  } catch (error) {
    console.error('Billplz bill creation error:', error);
    throw error;
  }
}

export async function getBill(billId: string): Promise<GetBillResponse> {
  if (!process.env.BILLPLZ_SECRET_KEY) {
    throw new Error('BILLPLZ_SECRET_KEY not configured');
  }

  try {
    const response = await fetch(`${BILLPLZ_BASE_URL}/v3/bills/${billId}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(process.env.BILLPLZ_SECRET_KEY + ':').toString('base64'),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Billplz get bill failed:', errorText);
      throw new Error(`Failed to get Billplz bill: ${errorText}`);
    }

    const data = await response.json() as GetBillResponse;
    return data;
  } catch (error) {
    console.error('Billplz get bill error:', error);
    throw error;
  }
}

export async function verifyBillPayment(billId: string): Promise<boolean> {
  try {
    const bill = await getBill(billId);
    return bill.paid === true && bill.state === 'paid';
  } catch (error) {
    console.error('Billplz payment verification error:', error);
    return false;
  }
}

/**
 * Construct the Billplz X-Signature source string from key-value pairs.
 * Per Billplz API docs:
 * 1. Extract all key-value pairs except x_signature
 * 2. Construct source string as "keyvalue" for each pair (no separator between key and value)
 * 3. Sort alphabetically (case-insensitive)
 * 4. Join with "|" pipe character
 */
function constructSourceString(params: Record<string, string>): string {
  const pairs: string[] = [];
  
  for (const [key, value] of Object.entries(params)) {
    if (key === 'x_signature') continue; // Exclude x_signature itself
    pairs.push(`${key}${value || ''}`);
  }
  
  // Sort ascending, case-insensitive
  pairs.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  
  return pairs.join('|');
}

/**
 * Verify Billplz X-Signature for callback URL (POST body params).
 * The callback sends all bill fields as URL-encoded POST body including x_signature.
 * @param params - Parsed key-value pairs from the POST body
 * @returns true if signature is valid
 */
export function verifyBillplzCallbackSignature(params: Record<string, string>): boolean {
  if (!process.env.BILLPLZ_SIGNATURE_KEY) {
    console.warn('BILLPLZ_SIGNATURE_KEY not configured - skipping signature verification (DEVELOPMENT ONLY)');
    return true;
  }

  try {
    const receivedSignature = params['x_signature'];
    if (!receivedSignature) {
      console.error('No x_signature found in callback params');
      return false;
    }

    const sourceString = constructSourceString(params);
    
    const expectedSignature = crypto
      .createHmac('sha256', process.env.BILLPLZ_SIGNATURE_KEY)
      .update(sourceString)
      .digest('hex');
    
    console.log('Billplz callback signature verification:', {
      sourceString,
      expectedSignature,
      receivedSignature,
      match: expectedSignature === receivedSignature
    });
    
    return expectedSignature === receivedSignature;
  } catch (error) {
    console.error('Billplz callback signature verification error:', error);
    return false;
  }
}

/**
 * Verify Billplz X-Signature for redirect URL (GET query params).
 * The redirect sends billplz[id], billplz[paid], billplz[paid_at], billplz[x_signature] as query params.
 * Source string keys use "billplz" prefix: e.g. "billplzidzq0tm2wc"
 * @param queryParams - The billplz query parameter object with id, paid, paid_at, x_signature
 * @returns true if signature is valid
 */
export function verifyBillplzRedirectSignature(queryParams: Record<string, string>): boolean {
  if (!process.env.BILLPLZ_SIGNATURE_KEY) {
    console.warn('BILLPLZ_SIGNATURE_KEY not configured - skipping signature verification (DEVELOPMENT ONLY)');
    return true;
  }

  try {
    const receivedSignature = queryParams['x_signature'];
    if (!receivedSignature) {
      console.error('No x_signature found in redirect params');
      return false;
    }

    // For redirect, keys are prefixed with "billplz" in the source string
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(queryParams)) {
      if (key === 'x_signature') continue;
      params[`billplz${key}`] = value || '';
    }

    const pairs: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      pairs.push(`${key}${value}`);
    }
    pairs.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    const sourceString = pairs.join('|');

    const expectedSignature = crypto
      .createHmac('sha256', process.env.BILLPLZ_SIGNATURE_KEY)
      .update(sourceString)
      .digest('hex');

    console.log('Billplz redirect signature verification:', {
      sourceString,
      expectedSignature,
      receivedSignature,
      match: expectedSignature === receivedSignature
    });

    return expectedSignature === receivedSignature;
  } catch (error) {
    console.error('Billplz redirect signature verification error:', error);
    return false;
  }
}
