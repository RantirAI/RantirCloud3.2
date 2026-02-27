import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { Upload, Plus, X, Sparkles, Database, Workflow, Cloud } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import dashboardPreview from "@/assets/dashboard-preview.jpeg";
import dataPreview from "@/assets/auth/data-preview.png";
import logicPreview from "@/assets/auth/logic-preview.png";
import cloudPreview from "@/assets/auth/cloud-preview.png";

type TabType = "ai" | "data" | "logic" | "cloud";

const Onboarding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { availablePlans } = useSubscription();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("ai");

  // Auto-switch between tabs
  useEffect(() => {
    const tabs: TabType[] = ["ai", "data", "logic", "cloud"];
    const interval = setInterval(() => {
      setActiveTab((current) => {
        const currentIndex = tabs.indexOf(current);
        return tabs[(currentIndex + 1) % tabs.length];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const getPreviewImage = () => {
    switch (activeTab) {
      case "ai": return dashboardPreview;
      case "data": return dataPreview;
      case "logic": return logicPreview;
      case "cloud": return cloudPreview;
      default: return dashboardPreview;
    }
  };

  // Step 1: Account details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: Plan selection (optional - can skip)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Step 3: Workspace setup
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceIcon, setWorkspaceIcon] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([""]);

  if (!loading && user && step === 1) {
    setStep(2); // If already logged in, skip to plan selection
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/onboarding`
      }
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created!");
      setStep(2);
    }
  };

  const handlePlanSelection = async () => {
    if (selectedPlan) {
      const plan = availablePlans.find(p => p.id === selectedPlan);
      if (plan) {
        if (plan.priceId) {
          // Trigger Stripe checkout for paid plans
          toast.info("Redirecting to checkout...");
          const { data, error } = await supabase.functions.invoke('create-checkout', {
            body: { priceId: plan.priceId },
          });
          
          if (error) {
            toast.error("Failed to create checkout session");
            return;
          }
          
          if (data?.url) {
            window.open(data.url, '_blank');
            toast.success("Checkout opened. Complete payment to continue.");
            setStep(3);
          }
        }
      }
    }
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWorkspaceIcon(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addInviteField = () => {
    setInviteEmails([...inviteEmails, ""]);
  };

  const updateInviteEmail = (index: number, value: string) => {
    const updated = [...inviteEmails];
    updated[index] = value;
    setInviteEmails(updated);
  };

  const removeInviteField = (index: number) => {
    setInviteEmails(inviteEmails.filter((_, i) => i !== index));
  };

  const handleWorkspaceSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Get the user's default workspace
      const { data: workspaces, error: workspaceError } = await supabase
        .from("workspaces")
        .select("id")
        .eq("user_id", user?.id)
        .eq("is_default", true)
        .single();

      if (workspaceError) throw workspaceError;

      // Update workspace name
      const { error: updateError } = await supabase
        .from("workspaces")
        .update({ name: workspaceName })
        .eq("id", workspaces.id);

      if (updateError) throw updateError;

      // Upload workspace icon if provided
      if (workspaceIcon) {
        const fileExt = workspaceIcon.name.split('.').pop();
        const fileName = `${workspaces.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("workspace-icons")
          .upload(fileName, workspaceIcon, { upsert: true });

        if (uploadError) {
          console.error("Icon upload error:", uploadError);
        }
      }

      // Send workspace invitations
      const validEmails = inviteEmails.filter(email => email.trim() !== "");
      if (validEmails.length > 0) {
        const { error: inviteError } = await supabase.functions.invoke("send-workspace-invitations", {
          body: {
            workspace_id: workspaces.id,
            emails: validEmails
          }
        });

        if (inviteError) {
          console.error("Invitation error:", inviteError);
          toast.error("Failed to send some invitations");
        }
      }

      toast.success("Workspace setup complete!");
      navigate("/");
    } catch (error: any) {
      console.error("Workspace setup error:", error);
      toast.error(error.message || "Failed to setup workspace");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-muted font-sans overflow-hidden">
      {/* Left Side - Preview */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900 flex-col text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.15]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />
        
        <div className="relative z-10 p-10 flex flex-col h-full">
          <div>
            {/* Rantir Cloud Logo with version */}
            <div className="mb-6 flex items-center gap-3">
              <div style={{ maxWidth: '100px' }}>
                <svg width="168" height="41" viewBox="0 0 168 41" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                  <g clipPath="url(#clip0_3506_38)">
                    <path d="M72.4512 40V23.68H77.1552V27.52H77.2512V40H72.4512ZM77.2512 31.488L76.8352 27.616C77.2192 26.2293 77.8485 25.1733 78.7232 24.448C79.5978 23.7227 80.6858 23.36 81.9872 23.36C82.3925 23.36 82.6912 23.4027 82.8832 23.488V27.968C82.7765 27.9253 82.6272 27.904 82.4352 27.904C82.2432 27.8827 82.0085 27.872 81.7312 27.872C80.1952 27.872 79.0645 28.1493 78.3392 28.704C77.6138 29.2373 77.2512 30.1653 77.2512 31.488Z" fill="white"/>
                    <path d="M65.4263 40V23.68H70.2263V40H65.4263Z" fill="white"/>
                    <path d="M61.4577 40.352C59.367 40.352 57.8097 39.8507 56.7857 38.848C55.783 37.824 55.2817 36.2773 55.2817 34.208V20.032L60.0817 18.5V34.368C60.0817 35.0933 60.2844 35.6373 60.6897 36C61.095 36.3627 61.7244 36.544 62.5777 36.544C62.8977 36.544 63.1964 36.512 63.4737 36.448C63.751 36.384 64.0284 36.3093 64.3057 36.224V39.872C64.0284 40.0213 63.6337 40.1387 63.1217 40.224C62.631 40.3093 62.0764 40.352 61.4577 40.352ZM52.2417 27.328V23.68H64.3057V27.328H52.2417Z" fill="white"/>
                    <path d="M36.1887 40L36.2087 26.5L40.8927 25V27.52H40.9887V40H36.1887ZM47.5487 40V29.888C47.5487 28.992 47.3141 28.32 46.8447 27.872C46.3967 27.424 45.7354 27.2 44.8607 27.2C44.1141 27.2 43.4421 27.3707 42.8447 27.712C42.2687 28.0533 41.8101 28.5227 41.4687 29.12C41.1487 29.7173 40.9887 30.4213 40.9887 31.232L40.5727 27.296C41.106 26.1013 41.8847 25.152 42.9087 24.448C43.9541 23.7227 45.2341 23.36 46.7487 23.36C48.5621 23.36 49.9487 23.872 50.9087 24.896C51.8687 25.8987 52.3487 27.2533 52.3487 28.96V40H47.5487Z" fill="white"/>
                    <path d="M0 16.96L10.4947 16.96C12.1587 16.96 13.6094 17.248 14.8467 17.824C16.0841 18.3787 17.0441 19.168 17.7267 20.192C18.4094 21.216 18.7507 22.4107 18.7507 23.776C18.7507 25.12 18.4094 26.304 17.7267 27.328C17.0441 28.3307 16.0841 29.12 14.8467 29.696C13.6094 30.2507 12.1587 30.528 10.4947 30.528H5.86346L3 26.912H10.3667C11.5401 26.912 12.4361 26.6454 13.0547 26.112C13.6947 25.5574 14.0147 24.7894 14.0147 23.808C14.0147 22.8054 13.7054 22.048 13.0867 21.536C12.4681 21.0027 11.5614 20.736 10.3667 20.736H2L0 16.96ZM13.1827 40L3.93473 28.032H9.15073L19.8387 40H13.1827Z" fill="white"/>
                    <path d="M33.7236 27.0748C33.973 27.771 34.0996 28.559 34.0996 29.4401V36.6403C34.0996 37.1735 34.1313 37.7175 34.1953 38.2721C34.2806 38.8053 34.4085 39.3812 34.5791 39.9996H29.7793C29.6513 39.5304 29.5552 39.0289 29.4912 38.4957C29.4632 38.1452 29.4452 37.7578 29.4355 37.3336C28.9816 38.2107 28.3714 38.8973 27.6035 39.3922C26.6435 40.0108 25.4696 40.3199 24.083 40.3199C22.4621 40.3199 21.1718 39.9145 20.2119 39.1041C19.252 38.2722 18.7715 37.1734 18.7715 35.8082C18.7715 34.2936 19.3371 33.0771 20.4678 32.1598C21.6198 31.2212 23.2197 30.6129 25.2676 30.3356L29.2998 29.7672V28.9283C29.2998 28.7025 29.271 28.4944 29.2188 28.3033L33.7236 27.0748ZM26.0674 33.0563C25.2141 33.1843 24.585 33.4191 24.1797 33.7604C23.7745 34.1016 23.5714 34.5705 23.5713 35.1676C23.5713 35.7009 23.7635 36.1071 24.1475 36.3844C24.5314 36.6616 25.0437 36.8004 25.6836 36.8004C26.6862 36.8004 27.5392 36.5329 28.2432 35.9996C28.9472 35.445 29.2998 34.805 29.2998 34.0797V32.5602L26.0674 33.0563ZM26.8672 23.36C29.2138 23.36 31.0058 23.883 32.2432 24.9283C32.5288 25.1696 32.7803 25.436 33 25.7262L28.8516 27.6119C28.7839 27.5343 28.7111 27.4595 28.6279 27.3922C28.2013 27.0082 27.5604 26.816 26.707 26.816C25.8967 26.8161 25.2464 26.9549 24.7559 27.2321C24.2865 27.5094 23.9765 27.9145 23.8271 28.4479H19.252C19.4653 26.976 20.2223 25.7604 21.5234 24.8004C22.8247 23.8405 24.606 23.36 26.8672 23.36Z" fill="white"/>
                    <path d="M71.6684 25.9727L68.395 18.8722C67.4212 16.9352 65.669 15.3158 63.1595 16.2032L26.5 29L62.2188 13.7823C64.1558 12.8086 65.2485 10.6932 64.8878 8.54688L63.5367 0.114162L67.3087 7.60617C68.2824 9.54313 70.3978 10.6359 72.5441 10.2752L80.9768 8.92405L73.4848 12.696C71.5479 13.6698 70.6693 16.3149 70.8158 17.9315L71.6684 25.9727Z" fill="white"/>
                    <path d="M164.467 40V36.192L164.787 36.288C164.382 37.5253 163.635 38.5067 162.547 39.232C161.48 39.9573 160.2 40.32 158.707 40.32C157.235 40.32 155.944 39.968 154.835 39.264C153.747 38.56 152.894 37.5787 152.275 36.32C151.678 35.0613 151.379 33.5893 151.379 31.904C151.379 30.1973 151.688 28.704 152.307 27.424C152.926 26.144 153.79 25.152 154.899 24.448C156.008 23.744 157.31 23.392 158.803 23.392C160.339 23.392 161.63 23.7653 162.675 24.512C163.72 25.2587 164.435 26.3147 164.819 27.68L164.307 27.744V16.96H166.867V40H164.467ZM159.187 38.08C160.83 38.08 162.11 37.5253 163.027 36.416C163.966 35.2853 164.435 33.7493 164.435 31.808C164.435 29.9093 163.966 28.4053 163.027 27.296C162.088 26.1867 160.808 25.632 159.187 25.632C157.566 25.632 156.296 26.1867 155.379 27.296C154.462 28.4053 154.003 29.9413 154.003 31.904C154.003 33.824 154.462 35.3387 155.379 36.448C156.296 37.536 157.566 38.08 159.187 38.08Z" fill="white"/>
                    <path d="M140.086 40.32C139.019 40.32 138.07 40.1067 137.238 39.68C136.406 39.232 135.755 38.6133 135.286 37.824C134.816 37.0133 134.582 36.0853 134.582 35.04V23.68H137.142V34.368C137.142 35.6053 137.44 36.5333 138.038 37.152C138.656 37.7707 139.531 38.08 140.662 38.08C141.686 38.08 142.592 37.8453 143.382 37.376C144.171 36.9067 144.79 36.256 145.238 35.424C145.707 34.5707 145.942 33.6 145.942 32.512L146.358 36.384C145.824 37.6 144.992 38.56 143.862 39.264C142.731 39.968 141.472 40.32 140.086 40.32ZM146.102 40V36.16H145.942V23.68H148.502V40H146.102Z" fill="white"/>
                    <path d="M123.83 40.32C122.23 40.32 120.822 39.9467 119.606 39.2C118.39 38.4533 117.441 37.44 116.758 36.16C116.097 34.8587 115.766 33.3973 115.766 31.776C115.766 30.1333 116.108 28.6827 116.79 27.424C117.473 26.1653 118.412 25.1733 119.606 24.448C120.822 23.7227 122.23 23.36 123.83 23.36C125.452 23.36 126.86 23.7227 128.054 24.448C129.27 25.1733 130.209 26.1653 130.87 27.424C131.553 28.6827 131.894 30.1333 131.894 31.776C131.894 33.3973 131.553 34.8587 130.87 36.16C130.209 37.44 129.27 38.4533 128.054 39.2C126.86 39.9467 125.452 40.32 123.83 40.32ZM123.83 38.144C124.94 38.144 125.9 37.8773 126.71 37.344C127.521 36.7893 128.15 36.032 128.598 35.072C129.046 34.112 129.27 33.0027 129.27 31.744C129.27 29.8667 128.769 28.3627 127.766 27.232C126.785 26.1013 125.473 25.536 123.83 25.536C122.209 25.536 120.897 26.1013 119.894 27.232C118.892 28.3627 118.39 29.8667 118.39 31.744C118.39 33.0027 118.614 34.112 119.062 35.072C119.51 36.032 120.14 36.7893 120.95 37.344C121.782 37.8773 122.742 38.144 123.83 38.144Z" fill="white"/>
                    <path d="M110.319 40V16.96H112.879V40H110.319Z" fill="white"/>
                    <path d="M97.512 40.32C95.9333 40.32 94.472 40.032 93.128 39.456C91.8053 38.8587 90.6533 38.0373 89.672 36.992C88.6906 35.9253 87.9333 34.6773 87.4 33.248C86.8666 31.7973 86.6 30.208 86.6 28.48C86.6 26.752 86.8666 25.1733 87.4 23.744C87.9333 22.2933 88.68 21.0453 89.64 20C90.6213 18.9333 91.7733 18.112 93.096 17.536C94.44 16.9387 95.9013 16.64 97.48 16.64C99.208 16.64 100.755 16.992 102.12 17.696C103.507 18.4 104.637 19.392 105.512 20.672C106.408 21.952 106.963 23.4453 107.176 25.152H104.552C104.296 23.2533 103.539 21.76 102.28 20.672C101.043 19.5627 99.4533 19.008 97.512 19.008C95.8693 19.008 94.4293 19.4133 93.192 20.224C91.9546 21.0133 90.9946 22.1227 90.312 23.552C89.6293 24.96 89.288 26.6027 89.288 28.48C89.288 30.3573 89.6293 32.0107 90.312 33.44C90.9946 34.848 91.9546 35.9573 93.192 36.768C94.4293 37.5573 95.8586 37.952 97.48 37.952C99.464 37.952 101.085 37.3973 102.344 36.288C103.624 35.1787 104.381 33.6853 104.616 31.808H107.24C107.027 33.5147 106.472 35.008 105.576 36.288C104.701 37.568 103.571 38.56 102.184 39.264C100.819 39.968 99.2613 40.32 97.512 40.32Z" fill="white"/>
                  </g>
                  <defs>
                    <clipPath id="clip0_3506_38">
                      <rect width="168" height="41" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
              </div>
              <span className="text-xs text-zinc-400 font-medium">v 2.2.1</span>
            </div>
            
            <h1 className="text-3xl font-light font-tiempos mb-2">Get Started with</h1>
            <h2 className="text-3xl font-light font-tiempos mb-6">Rantir Cloud</h2>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab("ai")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all ${
                  activeTab === "ai"
                    ? "bg-blue-500/20 border-blue-400"
                    : "bg-white/5 border-white/10 hover:border-blue-400/50"
                }`}
              >
                <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-md flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-medium">AI Builder</span>
              </button>
              
              <button
                onClick={() => setActiveTab("data")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all ${
                  activeTab === "data"
                    ? "bg-yellow-500/20 border-yellow-400"
                    : "bg-white/5 border-white/10 hover:border-yellow-400/50"
                }`}
              >
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-amber-400 rounded-md flex items-center justify-center">
                  <Database className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-medium">Data</span>
              </button>
              
              <button
                onClick={() => setActiveTab("logic")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all ${
                  activeTab === "logic"
                    ? "bg-purple-500/20 border-purple-400"
                    : "bg-white/5 border-white/10 hover:border-purple-400/50"
                }`}
              >
                <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-violet-400 rounded-md flex items-center justify-center">
                  <Workflow className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-medium">Logic</span>
              </button>
              
              <button
                onClick={() => setActiveTab("cloud")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all ${
                  activeTab === "cloud"
                    ? "bg-zinc-500/20 border-zinc-400"
                    : "bg-white/5 border-white/10 hover:border-zinc-400/50"
                }`}
              >
                <div className="w-6 h-6 bg-zinc-600 rounded-md flex items-center justify-center">
                  <Cloud className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-medium">Cloud</span>
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex items-end justify-end pb-0 mt-auto -mb-20 -mr-[300px]">
            <div 
              className="relative min-w-[900px] animate-[fadeInUp_1.2s_ease-out,floatSlow_6s_ease-in-out_infinite]"
              style={{
                transform: 'perspective(1200px) rotateX(12deg) rotateY(-8deg) scale(1.2)',
                transformOrigin: 'center bottom'
              }}
            >
              <div className="bg-zinc-800/40 backdrop-blur-xl rounded-t-lg border border-zinc-700/50 shadow-2xl animate-[drawIn_1s_ease-out]">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-700/50 bg-zinc-900/30 backdrop-blur-sm">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 mx-4 bg-zinc-700/40 backdrop-blur-sm rounded px-3 py-1 text-xs text-zinc-400">
                    http://rantir.cloud/your-company
                  </div>
                </div>
                
                <div className="relative overflow-hidden">
                  <img 
                    src={getPreviewImage()} 
                    alt="Dashboard Preview" 
                    className="w-full h-auto object-cover object-top transition-opacity duration-500"
                    style={{ maxHeight: '600px' }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-800 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Onboarding Steps */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <Logo className="h-10 w-auto mb-6" />
            
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                1
              </div>
              <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                2
              </div>
              <div className={`w-12 h-0.5 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                3
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {step === 1 && "Create your account"}
              {step === 2 && "Choose your plan"}
              {step === 3 && "Setup your workspace"}
            </p>
          </div>

          <div className="bg-card rounded-xl shadow-sm border p-6">
            {/* Step 1: Account Creation */}
            {step === 1 && (
              <form onSubmit={handleSignup} className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Create Account</h2>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                    disabled={submitting}
                    placeholder="Your full name" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    disabled={submitting}
                    placeholder="your@email.com" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    disabled={submitting}
                    placeholder="••••••••" 
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] px-6 py-3 text-sm font-medium" 
                    disabled={submitting}
                  >
                    {submitting ? "Creating account..." : "Continue"}
                  </Button>
                </div>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">Already have an account? </span>
                  <button type="button" className="text-primary hover:underline" onClick={() => navigate("/auth")}>
                    Sign in
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Plan Selection */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-2">Choose Your Plan</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Select a subscription to access the Rantir Cloud platform
                </p>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {availablePlans.map((plan) => (
                    <div 
                      key={plan.id} 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPlan === plan.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                      } ${plan.id === 'ai-core-access' ? 'ring-2 ring-primary/20' : ''}`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      <div className="flex items-baseline justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{plan.name}</h4>
                          {plan.id === 'ai-core-access' && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">Popular</span>
                          )}
                        </div>
                        <div className="text-sm font-bold">
                          ${plan.price.toLocaleString()}<span className="text-xs text-muted-foreground">/mo</span>
                        </div>
                      </div>
                      <ul className="space-y-1">
                        {plan.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button 
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] px-6 py-3 text-sm font-medium" 
                    onClick={handlePlanSelection}
                    disabled={!selectedPlan || submitting}
                  >
                    {submitting ? "Processing..." : "Subscribe & Continue"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Workspace Setup */}
            {step === 3 && (
              <form onSubmit={handleWorkspaceSetup} className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Setup Workspace</h2>
                
                <div className="space-y-2">
                  <Label htmlFor="workspaceName">Workspace Name</Label>
                  <Input 
                    id="workspaceName" 
                    type="text" 
                    value={workspaceName} 
                    onChange={e => setWorkspaceName(e.target.value)} 
                    required 
                    disabled={submitting}
                    placeholder="My Organization" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workspaceIcon">Workspace Icon (optional)</Label>
                  <div className="flex items-center gap-4">
                    {iconPreview && (
                      <img src={iconPreview} alt="Workspace icon" className="w-12 h-12 rounded-lg object-cover" />
                    )}
                    <label htmlFor="workspaceIcon" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">{workspaceIcon ? "Change Icon" : "Upload Icon"}</span>
                      </div>
                      <input 
                        id="workspaceIcon" 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={handleIconUpload}
                        disabled={submitting}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Invite Team Members (optional)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addInviteField}
                      disabled={submitting}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {inviteEmails.map((email, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input 
                        type="email" 
                        value={email} 
                        onChange={e => updateInviteEmail(index, e.target.value)} 
                        placeholder="colleague@email.com"
                        disabled={submitting}
                      />
                      {inviteEmails.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInviteField(index)}
                          disabled={submitting}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4 justify-end">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => navigate("/")}
                  >
                    Skip for now
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] px-6 py-3 text-sm font-medium"
                    disabled={submitting || !workspaceName}
                  >
                    {submitting ? "Setting up..." : "Complete Setup"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
