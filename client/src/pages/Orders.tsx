import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  CheckCircle, 
  Package, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Copy,
  Check,
  Mail,
  ShoppingBag,
  User as UserIcon,
  PartyPopper,
  X
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { Order, RedemptionCode } from "@shared/schema";

function OrderCard({ order, autoExpand }: { order: Order; autoExpand?: boolean }) {
  const [expanded, setExpanded] = useState(autoExpand || false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (autoExpand) {
      setExpanded(true);
    }
  }, [autoExpand]);

  const { data: codes = [], isLoading: loadingCodes } = useQuery<RedemptionCode[]>({
    queryKey: [`/api/orders/${order.id}/codes`],
    enabled: expanded,
  });

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: "Copied!",
      description: "Redemption code copied to clipboard.",
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Card
      className="bg-gradient-to-br from-[#1a1a1a] to-[#000000] border-2 border-neon-yellow/30 rounded-3xl"
      data-testid={`card-order-${order.id}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bebas text-white uppercase">
            Order #{order.id.slice(0, 8)}
          </CardTitle>
          <Badge 
            className={`${
              order.status === 'completed' || order.status === 'fulfilled'
                ? 'bg-green-500' 
                : 'bg-yellow-500'
            } text-black font-bold`}
          >
            {order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-400 font-rajdhani">Total:</span>
            <p className="text-neon-yellow font-rajdhani font-bold text-lg">
              RM{Math.round(parseFloat(order.finalAmount))}
            </p>
          </div>
          <div>
            <span className="text-gray-400 font-rajdhani">Date:</span>
            <p className="text-white font-rajdhani">
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {(order.status === 'completed' || order.status === 'fulfilled') && (
          <>
            <Separator className="bg-white/10" />
            <Button
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="w-full justify-between text-white hover:text-neon-yellow"
              data-testid={`button-toggle-codes-${order.id}`}
            >
              <span className="font-rajdhani">
                {expanded ? 'Hide' : 'View'} Redemption Codes
              </span>
              {expanded ? <ChevronUp /> : <ChevronDown />}
            </Button>

            {expanded && (
              <div className="space-y-3 pt-2">
                {loadingCodes ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-neon-yellow animate-spin" />
                  </div>
                ) : codes.length > 0 ? (
                  <>
                    <div className="bg-black/20 border border-neon-yellow/30 rounded-xl p-3 mb-3">
                      <p className="text-xs text-gray-300 font-rajdhani flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-neon-yellow" />
                        <span>Use these codes in GTA 5 to redeem your AECOIN</span>
                      </p>
                    </div>
                    {codes.map((code, index) => (
                      <div
                        key={code.id}
                        className="group relative bg-gradient-to-br from-black/40 to-black/20 border-2 border-neon-yellow/30 hover:border-neon-yellow/60 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-neon-yellow/20"
                        data-testid={`code-${code.id}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-neon-yellow/20 text-neon-yellow border border-neon-yellow/40 font-bebas text-sm">
                                {code.aecoinAmount.toLocaleString()} AECOIN
                              </Badge>
                              <span className="text-xs text-gray-500 font-rajdhani">
                                Code #{index + 1}
                              </span>
                            </div>
                            <code className="text-neon-yellow font-mono text-base font-bold tracking-wider block break-all">
                              {code.code}
                            </code>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCode(code.code)}
                            className="h-10 px-3 text-white hover:text-neon-yellow hover:bg-neon-yellow/10 border border-transparent hover:border-neon-yellow/30 transition-all"
                            data-testid={`button-copy-${code.id}`}
                          >
                            {copiedCode === code.code ? (
                              <>
                                <Check className="w-4 h-4 mr-2" />
                                <span className="text-xs font-rajdhani">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-2" />
                                <span className="text-xs font-rajdhani">Copy</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-gray-400 text-sm font-rajdhani text-center py-4">
                    No redemption codes available.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Orders() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [autoExpandedOrderId, setAutoExpandedOrderId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  // Check for payment success query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const provider = params.get('provider');
    
    if (paymentStatus === 'success' && orders.length > 0) {
      setShowSuccessBanner(true);
      // Auto-expand the latest order (first in the list)
      const latestOrder = orders[0];
      if (latestOrder && (latestOrder.status === 'fulfilled' || latestOrder.status === 'completed')) {
        setAutoExpandedOrderId(latestOrder.id);
      }
    }
  }, [orders]);

  if (!user) {
    navigate("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-yellow animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Header */}
      <header className="border-b-4 border-neon-yellow bg-gradient-to-r from-[#000000] to-[#1a1a1a] sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-white hover:text-neon-yellow"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Shop
          </Button>
          <h1 className="text-3xl font-bebas text-neon-yellow uppercase tracking-wider">
            Profile & Orders
          </h1>
          <div className="w-24" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Success Banner */}
        {showSuccessBanner && (
          <div className="mb-8 bg-gradient-to-r from-green-500/20 to-neon-yellow/20 border-2 border-green-500/50 rounded-3xl p-6 relative animate-in fade-in slide-in-from-top-4 duration-500">
            <button
              onClick={() => setShowSuccessBanner(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-4">
              <div className="bg-green-500/20 p-3 rounded-full">
                <PartyPopper className="w-8 h-8 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bebas text-white mb-2 uppercase tracking-wider">
                  🎉 Payment Successful!
                </h3>
                <p className="text-gray-300 font-rajdhani mb-3">
                  Thank you for your purchase! Your redemption codes are ready below.
                </p>
                <div className="bg-black/30 border border-neon-yellow/30 rounded-xl p-4">
                  <p className="text-sm text-gray-300 font-rajdhani mb-2 font-bold">
                    📋 How to redeem your AECOIN:
                  </p>
                  <ol className="text-sm text-gray-400 font-rajdhani space-y-1 list-decimal list-inside">
                    <li>Join the GTA 5 server</li>
                    <li>Open the chat and type: <code className="text-neon-yellow bg-black/50 px-2 py-0.5 rounded">/redeem [code]</code></li>
                    <li>Your AECOIN will be added to your account instantly!</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Profile Section */}
        <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#000000] border-2 border-neon-yellow/30 rounded-3xl mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="absolute inset-0 bg-neon-yellow/20 blur-2xl rounded-full"></div>
                <Avatar className="w-24 h-24 ring-4 ring-neon-yellow/50 relative">
                  <AvatarImage src={user.avatar || undefined} alt={user.username} />
                  <AvatarFallback className="bg-neon-yellow text-black font-bold text-3xl">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <h2 className="text-3xl font-bebas text-white uppercase tracking-wider">
                    {user.username}
                  </h2>
                  <Badge className="bg-black text-neon-yellow border border-neon-yellow/50 font-rajdhani">
                    <SiDiscord className="w-3 h-3 mr-1" />
                    Discord
                  </Badge>
                </div>
                
                <div className="space-y-2 text-gray-300 font-rajdhani">
                  {user.email && (
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Mail className="w-4 h-4 text-neon-yellow" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <ShoppingBag className="w-4 h-4 text-neon-yellow" />
                    <span className="text-sm">{orders.length} Total Order{orders.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4 md:gap-6">
                <div className="text-center bg-black/30 rounded-2xl p-4 min-w-[100px]">
                  <p className="text-3xl font-bebas text-neon-yellow">
                    {orders.filter(o => o.status === 'fulfilled' || o.status === 'completed').length}
                  </p>
                  <p className="text-xs text-gray-400 font-rajdhani uppercase">Completed</p>
                </div>
                <div className="text-center bg-black/30 rounded-2xl p-4 min-w-[100px]">
                  <p className="text-3xl font-bebas text-neon-yellow">
                    RM{orders.reduce((sum, o) => sum + parseFloat(o.finalAmount), 0).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-400 font-rajdhani uppercase">Total Spent</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bebas text-white uppercase tracking-wider mb-4">
            Order History
          </h2>

          {orders.length === 0 ? (
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#000000] border-2 border-white/10 rounded-3xl">
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 font-rajdhani text-lg">
                  No orders yet. Your order history will appear here.
                </p>
                <Button
                  onClick={() => navigate("/")}
                  className="mt-6 bg-neon-yellow hover:bg-neon-yellow/90 text-black font-bold"
                  data-testid="button-shop-now"
                >
                  Start Shopping
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  autoExpand={order.id === autoExpandedOrderId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
