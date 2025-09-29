import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Scan, Plus } from "lucide-react";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Quét Vé Khu Du Lịch
        </h1>
        <p className="text-gray-600 mb-8">Quản lý vé tham quan nhanh chóng</p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/scan">
            <Button
              size="lg"
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Scan className="h-5 w-5" />
              <span>Quét Vé</span>
            </Button>
          </Link>
          <Link href="/create">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span>Tạo Vé</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
