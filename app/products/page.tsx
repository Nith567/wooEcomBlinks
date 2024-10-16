"use client";
import { BlinkDialog } from "@/components/UI/Product/BlinkDialog";
import { ProductCard } from "@/components/UI/Product/ProductCard";
import { extractTextFromHTML } from "@/lib/extracthtml";
import { Product } from "@/lib/products";
import { useWallet } from "@solana/wallet-adapter-react";
import axios, { AxiosResponse } from "axios";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface CurrencyResponse {
  code: string;
  [key: string]: any; // In case there are other fields, we use index signature
}

export default function Page() {
  // const [products, setProducts] = useState([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [currency_rate, setCurrencyRate] = useState("1");
  const [currencySymbol, setCurrencySymbol] = useState("USD");

  const { publicKey, connected } = useWallet();
  const router = useRouter();

  const session = useSession();
  const currency_url = `https://v6.exchangerate-api.com/v6/35e3fc6e6f0224062d2bf0b2/latest/USD`;

  const consumerKey = session?.data?.user.consumerKey;
  const consumerSecret = session?.data?.user.consumerSecret;
  const urLink = session?.data?.user.wooEcomWebsiteUrl;

  console.log(urLink);
  const auth = {
    username: consumerKey,
    password: consumerSecret,
  };

  console.log("urllink", urLink);
  useEffect(() => {
    const fetchdata = async () => {
      try {
        const response: AxiosResponse<CurrencyResponse> = await axios.get(
          `${urLink}/wp-json/wc/v3/data/currencies/current`,
          //@ts-ignore
          { auth }
        );
        setCurrencySymbol(response.data.code);
      } catch (error) {
        console.error("Error fetching currency data:", error);
      }

      if (currency_rate !== "USD") {
        fetch(currency_url).then((res) => {
          res.json().then((data) => {
            setCurrencyRate(data.conversion_rates[currencySymbol!]);
          });
        });
      }
    };
    fetchdata();
  }, []);

  useEffect(() => {
    fetch(`/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data));
  }, []);
  const handleGenerateBlink = async (product: Product) => {
    setSelectedProduct(product);
    setIsGenerating(true);
    setGeneratedLink("");
    const metadata = {
      title: product.name,
      description: extractTextFromHTML(product.description),
      image: product.images[0].src,
      price: product.price,
      walletAddress: publicKey?.toBase58(),
      product_id: product.id,
      updated_price: (product.price / parseFloat(currency_rate)).toFixed(2),
    };
    if (!connected) {
      toast.error("Please connect your wallet first to recive the payments");
      setTimeout(() => {
        router.push("/profile");
      }, 2000);
    } else {
      const res = await axios.post(`/blink/create`, JSON.stringify(metadata));
      const url = `https://wooecomblinks.online/blink?id=${res.data}`;
      setTimeout(() => {
        setIsGenerating(false);
        setGeneratedLink(
          `https://dial.to/?action=solana-action:${encodeURIComponent(
            url
          )}&cluster=mainnet`
        );
      }, 2000);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success("Link copied!");
  };
  useSession({
    required: true,
    onUnauthenticated() {
      redirect("/profile");
    },
  });
  return (
    <div className={`min-h-screen`}>
      <div className="bg-blue-50 dark:bg-gray-800 transition-colors duration-300">
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8 text-blue-900 dark:text-blue-200">
            Your Store Products
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div></div>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onGenerateBlink={(product) => handleGenerateBlink(product)}
                currency_rate={currency_rate}
              />
            ))}
          </div>
        </main>
        <BlinkDialog
          product={selectedProduct}
          isOpen={selectedProduct !== null}
          onClose={() => setSelectedProduct(null)}
          isGenerating={isGenerating}
          generatedLink={generatedLink}
          onCopyLink={handleCopyLink}
        />

        <ToastContainer position="bottom-right" />
      </div>
    </div>
  );
}

function htmlToText(html: string) {
  const tempDiv = document.createElement("div");

  tempDiv.innerHTML = html;

  return tempDiv.textContent || "";
}
