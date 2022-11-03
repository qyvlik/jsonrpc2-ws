
export default async function tries(times, fun) {
    while (times-- > 0) {
        await fun(times);
    }
}
