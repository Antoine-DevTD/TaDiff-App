import Image from "next/image";
import { cn } from "@/lib/utils";

export function TadiffMark({
  className,
  imageClassName,
}: {
  className?: string;
  imageClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] bg-[#1d1d1f]",
        className,
      )}
    >
      <Image
        alt=""
        aria-hidden="true"
        className={cn("h-full w-full object-cover", imageClassName)}
        height={1024}
        src="/icons/tadiff-mark.svg"
        width={1024}
      />
    </span>
  );
}
