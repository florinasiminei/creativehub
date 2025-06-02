"use client";

import Image from "next/image";
import Slider from "react-slick";

type ListingCarouselProps = {
  images: string[];
};

const ListingCarousel = ({ images }: ListingCarouselProps) => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
  };

  return (
    <Slider {...settings}>
      {images.map((url, i) => (
        <div key={i}>
          <Image
            src={url}
            alt={`Imagine ${i + 1}`}
            width={800}
            height={600}
            className="rounded-2xl object-cover w-full h-auto shadow"
          />
        </div>
      ))}
    </Slider>
  );
};

export default ListingCarousel;
