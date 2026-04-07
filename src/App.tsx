import { useState } from 'react';
import { Settings, RefreshCw, Facebook, Sparkles, Package, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from './lib/utils';
import type { KiotVietProduct } from './types';

export default function App() {
  // Credentials State
  const [kvRetailer, setKvRetailer] = useState('');
  const [kvClientId, setKvClientId] = useState('');
  const [kvClientSecret, setKvClientSecret] = useState('');
  const [fbPageId, setFbPageId] = useState('');
  const [fbAccessToken, setFbAccessToken] = useState('');

  // App State
  const [products, setProducts] = useState<KiotVietProduct[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Post Generation State
  const [selectedProduct, setSelectedProduct] = useState<KiotVietProduct | null>(null);
  const [generatedPost, setGeneratedPost] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  const fetchProducts = async () => {
    if (!kvRetailer || !kvClientId || !kvClientSecret) {
      setError('Please fill in all KiotViet credentials first.');
      return;
    }
    setError(null);
    setIsFetching(true);
    try {
      const res = await fetch('/api/kiotviet/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retailer: kvRetailer, clientId: kvClientId, clientSecret: kvClientSecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch products');
      setProducts(data.products || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  const generatePost = async (product: KiotVietProduct) => {
    setSelectedProduct(product);
    setGeneratedPost('');
    setPostSuccess(false);
    setError(null);
    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate post');
      setGeneratedPost(data.content);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const postToFacebook = async () => {
    if (!fbPageId || !fbAccessToken) {
      setError('Please fill in Facebook Page ID and Access Token.');
      return;
    }
    if (!generatedPost) return;

    setIsPosting(true);
    setError(null);
    try {
      const res = await fetch('/api/facebook/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: fbPageId, accessToken: fbAccessToken, message: generatedPost }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post to Facebook');
      setPostSuccess(true);
      setTimeout(() => setPostSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar: Configuration */}
      <aside className="w-full md:w-80 bg-white border-r border-gray-200 p-6 flex flex-col gap-6 overflow-y-auto">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Configuration
          </h2>
          <p className="text-sm text-gray-500 mt-1">Enter your API credentials</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">KiotViet API</h3>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Retailer (Store Name)</label>
            <input
              type="text"
              value={kvRetailer}
              onChange={(e) => setKvRetailer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. mystore"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Client ID</label>
            <input
              type="text"
              value={kvClientId}
              onChange={(e) => setKvClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="KiotViet Client ID"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Client Secret</label>
            <input
              type="password"
              value={kvClientSecret}
              onChange={(e) => setKvClientSecret(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••••••"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Facebook className="w-4 h-4 text-blue-600" /> Facebook Page
          </h3>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Page ID</label>
            <input
              type="text"
              value={fbPageId}
              onChange={(e) => setFbPageId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1234567890"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Page Access Token</label>
            <input
              type="password"
              value={fbAccessToken}
              onChange={(e) => setFbAccessToken(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="EAA..."
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Products</h1>
              <p className="text-gray-500">Fetch products from KiotViet to generate posts.</p>
            </div>
            <button
              onClick={fetchProducts}
              disabled={isFetching}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Fetch Products
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Product Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {products.length === 0 && !isFetching && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No products loaded</h3>
                <p className="text-gray-500 mt-1">Configure your KiotViet API and click fetch.</p>
              </div>
            )}

            {products.map((product) => (
              <div key={product.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900 line-clamp-2" title={product.fullName}>
                      {product.fullName}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {product.code}
                    </span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600 flex justify-between">
                      <span>Category:</span>
                      <span className="font-medium text-gray-900">{product.categoryName || 'N/A'}</span>
                    </p>
                    <p className="text-sm text-gray-600 flex justify-between">
                      <span>Price:</span>
                      <span className="font-medium text-blue-600">{product.basePrice.toLocaleString('vi-VN')} ₫</span>
                    </p>
                    <p className="text-sm text-gray-600 flex justify-between">
                      <span>Stock:</span>
                      <span className="font-medium text-gray-900">
                        {product.inventories?.reduce((acc, inv) => acc + inv.onHand, 0) || 0}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => generatePost(product)}
                    disabled={isGenerating && selectedProduct?.id === product.id}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {isGenerating && selectedProduct?.id === product.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    )}
                    Generate Post
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Side Panel: Post Editor */}
      {selectedProduct && (
        <aside className="w-full md:w-96 bg-white border-l border-gray-200 p-6 flex flex-col h-screen sticky top-0 shadow-xl md:shadow-none z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Facebook className="w-5 h-5 text-blue-600" />
              Post Editor
            </h2>
            <button 
              onClick={() => setSelectedProduct(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              &times;
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-sm font-medium text-blue-900 mb-1">Target Product:</p>
              <p className="text-sm text-blue-800">{selectedProduct.fullName}</p>
            </div>

            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Generated Content
              </label>
              {isGenerating ? (
                <div className="flex-1 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center min-h-[200px]">
                  <div className="text-center">
                    <Sparkles className="w-8 h-8 text-blue-500 animate-pulse mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Gemini is writing...</p>
                  </div>
                </div>
              ) : (
                <textarea
                  value={generatedPost}
                  onChange={(e) => setGeneratedPost(e.target.value)}
                  className="flex-1 w-full p-4 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[200px]"
                  placeholder="Your post content will appear here..."
                />
              )}
            </div>
          </div>

          <div className="pt-6 mt-auto border-t border-gray-100">
            {postSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Successfully posted to Facebook!
              </div>
            )}
            <button
              onClick={postToFacebook}
              disabled={!generatedPost || isPosting || isGenerating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPosting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Facebook className="w-5 h-5" />
              )}
              Publish to Page
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
