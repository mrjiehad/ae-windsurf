import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Image as ImageIcon, Plus, Edit, Trash2, Eye, EyeOff, Sparkles } from "lucide-react";

interface HeroSetting {
  id: string;
  backgroundImage: string;
  videoThumbnail: string | null;
  isActive: boolean;
  updatedAt: string;
}

const heroSchema = z.object({
  backgroundImage: z.string().min(1, "Background image is required"),
  videoThumbnail: z.string().optional(),
  isActive: z.boolean().default(true),
});

type HeroFormData = z.infer<typeof heroSchema>;

export default function AdminHero() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<HeroSetting | null>(null);

  const { data: settings, isLoading } = useQuery<HeroSetting[]>({
    queryKey: ["/api/admin/hero"],
  });

  const form = useForm<HeroFormData>({
    resolver: zodResolver(heroSchema),
    defaultValues: {
      backgroundImage: "",
      videoThumbnail: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: HeroFormData) => {
      return apiRequest("POST", "/api/admin/hero", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hero"] });
      toast({
        title: "Hero Setting Created",
        description: "Hero section has been updated successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create hero setting.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: HeroFormData }) => {
      return apiRequest("PATCH", `/api/admin/hero/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hero"] });
      toast({
        title: "Hero Setting Updated",
        description: "Hero section has been updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingSetting(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update hero setting.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/hero/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hero"] });
      toast({
        title: "Hero Setting Deleted",
        description: "Hero setting has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete hero setting.",
        variant: "destructive",
      });
    },
  });

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-zinc-900 border-yellow-500/20">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bebas text-yellow-400 mb-4">ACCESS DENIED</h2>
            <p className="text-zinc-400">Administrator access required</p>
            <Button
              onClick={() => navigate("/")}
              className="mt-4"
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEdit = (setting: HeroSetting) => {
    setEditingSetting(setting);
    form.reset({
      backgroundImage: setting.backgroundImage,
      videoThumbnail: setting.videoThumbnail || "",
      isActive: setting.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSetting(null);
    form.reset();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "backgroundImage" | "videoThumbnail") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      form.setValue(field, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: HeroFormData) => {
    if (editingSetting) {
      updateMutation.mutate({ id: editingSetting.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      <AdminSidebar />

      <main className="flex-1 ml-64 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bebas text-yellow-400 mb-2 flex items-center gap-3">
              <Sparkles className="w-10 h-10" />
              HERO SECTION SETTINGS
            </h1>
            <p className="text-zinc-400">Manage homepage hero background and video thumbnail</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-yellow-400 text-black hover:bg-yellow-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Hero Setting
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-yellow-500/20 text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bebas text-yellow-400">
                  {editingSetting ? "EDIT HERO SETTING" : "ADD HERO SETTING"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="backgroundImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Background Image</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, "backgroundImage")}
                              className="bg-black border-zinc-700"
                            />
                            {field.value && (
                              <img
                                src={field.value}
                                alt="Background Preview"
                                className="w-full h-48 object-cover rounded-lg border border-yellow-500/20"
                              />
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>Main hero background image (Max 5MB)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="videoThumbnail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video Thumbnail (Optional)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, "videoThumbnail")}
                              className="bg-black border-zinc-700"
                            />
                            {field.value && (
                              <img
                                src={field.value}
                                alt="Video Thumbnail Preview"
                                className="w-full h-32 object-cover rounded-lg border border-yellow-500/20"
                              />
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>Optional video thumbnail (Max 5MB)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="w-5 h-5 rounded border-zinc-700 bg-black"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Active (Use this hero setting)</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      className="flex-1 bg-yellow-400 text-black hover:bg-yellow-500"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Saving..."
                        : editingSetting
                        ? "Update"
                        : "Create"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-zinc-900 border-yellow-500/20">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 text-zinc-700 mx-auto mb-4 animate-pulse" />
                <p className="text-zinc-400">Loading hero settings...</p>
              </div>
            ) : settings && settings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settings.map((setting) => (
                  <Card
                    key={setting.id}
                    className="bg-black border border-yellow-500/20 hover-elevate overflow-hidden"
                  >
                    <div className="relative aspect-video">
                      <img
                        src={setting.backgroundImage}
                        alt="Hero Background"
                        className="w-full h-full object-cover"
                      />
                      {!setting.isActive && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <EyeOff className="w-12 h-12 text-zinc-500" />
                        </div>
                      )}
                      {setting.isActive && (
                        <div className="absolute top-2 right-2">
                          <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            ACTIVE
                          </span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {setting.videoThumbnail && (
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Video Thumbnail:</p>
                            <img
                              src={setting.videoThumbnail}
                              alt="Video Thumbnail"
                              className="w-full h-20 object-cover rounded border border-yellow-500/20"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span>Updated: {new Date(setting.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                            onClick={() => handleEdit(setting)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this hero setting?"
                                )
                              ) {
                                deleteMutation.mutate(setting.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-400 mb-4">No hero settings yet</p>
                <p className="text-zinc-500 text-sm">
                  Click "Add Hero Setting" to create your first hero background
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
