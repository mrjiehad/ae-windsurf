import crypto from 'crypto';
import { Request, Response } from 'express';

const BILLPLZ_BASE_URL = 'https://www.billplz.com/api';

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

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

interface BillplzCallbackPayload {
  id: string;
  paid: 'true' | 'false';
  state: string;
  amount: string;
  paid_amount: string;
  x_signature: string;
  [key: string]: string;
}

/* -------------------------------------------------------------------------- */
/*                              COLLECTION CACHE                               */
/* -------------------------------------------------------------------------- */

let collectionId: string | null = null;

/* -------------------------------------------------------------------------- */
/*                           COLLECTION CREATION                               */
/* -------------------------------------------------------------------------- */

async function ensureCollectionExists(): Promise<string> {
  if (collectionId) return collectionId;

  if (!process.env.BILLPLZ_SECRET_KEY) {
    throw new Error('BILLPLZ_SECRET_KEY not configured');
  }

  const response = await fetch(`${BILLPLZ_BASE_URL}/v3/collections`, {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(process.env.BILLPLZ_SECRET_KEY + ':').toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'AECOIN Store',
      description: 'GTA Online virtual currency packages',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Billplz collection: ${errorText}`);
  }

  const data = (await response.json()) as CreateCollectionResponse;

  if (!data.id) {
    throw new Error('Invalid Billplz collection response');
  }

  collectionId = data.id;
  console.log('✓ Billplz collection created:', collectionId);

  return collectionId;
}

/* -------------------------------------------------------------------------- */
/*                                CREATE BILL                                  */
/* -------------------------------------------------------------------------- */

export async function createBill(params: {
  description: string;
  amount: number; // MYR
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
  const amountInCents = Math.round(params.amount * 100);

  const billData: Record<string, any> = {
    collection_id: collId,
    description: params.description,
    email: params.email,
    name: params.name,
    amount: amountInCents,
    callback_url: params.callbackUrl,
    redirect_url: params.redirectUrl,
  };

  if (params.mobile) billData.mobile = params.mobile;
  if (params.reference1Label && params.reference1) {
    billData.reference_1_label = params.reference1Label;
    billData.reference_1 = params.reference1;
  }

  const response = await fetch(`${BILLPLZ_BASE_URL}/v3/bills`, {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(process.env.BILLPLZ_SECRET_KEY + ':').toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(billData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Billplz bill: ${errorText}`);
  }

  return (await response.json()) as CreateBillResponse;
}

/* -------------------------------------------------------------------------- */
/*                                 GET BILL                                   */
/* -------------------------------------------------------------------------- */

export async function getBill(billId: string): Promise<GetBillResponse> {
  if (!process.env.BILLPLZ_SECRET_KEY) {
    throw new Error('BILLPLZ_SECRET_KEY not configured');
  }

  const response = await fetch(`${BILLPLZ_BASE_URL}/v3/bills/${billId}`, {
    method: 'GET',
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(process.env.BILLPLZ_SECRET_KEY + ':').toString('base64'),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Billplz bill: ${errorText}`);
  }

  return (await response.json()) as GetBillResponse;
}

/* -------------------------------------------------------------------------- */
/*                           VERIFY PAYMENT (PULL)                             */
/* -------------------------------------------------------------------------- */

export async function verifyBillPayment(billId: string): Promise<boolean> {
  const bill = await getBill(billId);
  return bill.paid === true && bill.state === 'paid';
}

/* -------------------------------------------------------------------------- */
/*                        CALLBACK SIGNATURE VERIFY                             */
/* -------------------------------------------------------------------------- */

function verifyBillplzCallbackSignature(
  payload: BillplzCallbackPayload
): boolean {
  if (!process.env.BILLPLZ_SECRET_KEY) {
    throw new Error('BILLPLZ_SECRET_KEY not configured');
  }

  const { x_signature, ...data } = payload;

  const sortedKeys = Object.keys(data).sort();

  const signingString =
    sortedKeys.map(key => `${key}=${data[key]}`).join('|') +
    `|${process.env.BILLPLZ_SECRET_KEY}`;

  const expectedSignature = crypto
    .createHash('sha256')
    .update(signingString)
    .digest('hex');

  return expectedSignature === x_signature;
}

/* -------------------------------------------------------------------------- */
/*                           CALLBACK HANDLER                                  */
/* -------------------------------------------------------------------------- */

export async function billplzCallbackHandler(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const payload = req.body as BillplzCallbackPayload;

    if (!payload?.id || !payload?.x_signature) {
      return res.status(400).send('Invalid callback payload');
    }

    const isValid = verifyBillplzCallbackSignature(payload);

    if (!isValid) {
      console.error('❌ Invalid Billplz callback signature', payload);
      return res.status(403).send('Invalid signature');
    }

    if (payload.paid === 'true') {
      // TODO: update database / mark order paid
      console.log('✅ Payment confirmed:', payload.id);
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Billplz callback error:', error);
    return res.status(500).send('Internal Server Error');
  }
}
