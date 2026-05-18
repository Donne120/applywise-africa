/** Shimmer placeholder for slow-network loading states. Mobile-tuned. */
export default function Skeleton({
  height = 16,
  width = '100%',
  radius = 8,
  style,
}: {
  height?: number | string;
  width?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className="skeleton-shimmer"
      style={{ height, width, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}
